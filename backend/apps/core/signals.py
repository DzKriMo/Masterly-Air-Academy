import json
import logging
import threading
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()

logger = logging.getLogger('masterly.audit')

# Thread-local storage for pre_save snapshots, keyed by (model_name, instance_pk)
_thread_local = threading.local()


def _get_snapshot_key(instance):
    return (instance.__class__.__name__, getattr(instance, 'pk', None))


def _store_pre_save_snapshot(instance):
    """Called from pre_save: snapshot the current DB state before the update."""
    if not instance.pk:
        return  # New instance, no old state
    try:
        from django.forms.models import model_to_dict
        old = instance.__class__.objects.filter(pk=instance.pk).first()
        if old:
            snapshot = model_to_dict(old)
            # Convert non-serializable values
            for k, v in snapshot.items():
                if hasattr(v, 'pk'):
                    snapshot[k] = str(v)
            key = _get_snapshot_key(instance)
            if not hasattr(_thread_local, 'snapshots'):
                _thread_local.snapshots = {}
            _thread_local.snapshots[key] = json.loads(json.dumps(snapshot, default=str))
    except Exception as e:
        logger.warning('audit pre_save snapshot failed for %s', instance, exc_info=e)


def _pop_pre_save_snapshot(instance):
    """Called from post_save: retrieve and remove the pre_save snapshot."""
    try:
        if hasattr(_thread_local, 'snapshots'):
            key = _get_snapshot_key(instance)
            return _thread_local.snapshots.pop(key, None)
    except Exception as e:
        logger.warning('audit snapshot pop failed for %s', instance, exc_info=e)
    return None


def _get_current_request():
    """Get the current request from thread-local storage (set by RequestIdMiddleware)."""
    from apps.core.middleware import RequestIdMiddleware
    return RequestIdMiddleware.get_current_request()


def get_request_info():
    """Extract IP and user-agent from the current request (thread-local, not frame inspection)."""
    request = _get_current_request()
    if request and hasattr(request, 'META'):
        return {
            'ip_address': request.META.get('REMOTE_ADDR', ''),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500],
        }
    return {'ip_address': '', 'user_agent': ''}


def get_authenticated_user():
    """Get the authenticated user from thread-local request storage."""
    request = _get_current_request()
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
    return None


# Models that Django manages internally — never log them
SILENT_MODELS = {'AuditLog', 'Session', 'ContentType', 'Permission', 'Group', 'LogEntry'}

# Only log models from our project apps — skip third-party and Django internals
def _is_project_model(sender):
    module = sender.__module__
    return module.startswith('apps.') or 'masterly' in module.split('.')[0] if module else False


@receiver(pre_save)
def audit_log_pre_save(sender, instance, **kwargs):
    if sender.__name__ in SILENT_MODELS or not _is_project_model(sender):
        return
    _store_pre_save_snapshot(instance)


@receiver(post_save)
def audit_log_save(sender, instance, created, **kwargs):
    if sender.__name__ in SILENT_MODELS or not _is_project_model(sender):
        return

    from .models import AuditLog
    user = get_authenticated_user()
    if not user:
        return

    request_info = get_request_info()

    old_values = None
    new_values = None

    if created:
        action = 'create'
        new_values = _serialize_instance(instance)
    else:
        action = 'update'
        old_values = _pop_pre_save_snapshot(instance)
        new_values = _serialize_instance(instance)

    AuditLog.objects.create(
        user=user,
        action=action,
        entity=sender.__name__,
        entity_id=getattr(instance, 'id', None),
        old_values=old_values,
        new_values=new_values,
        ip_address=request_info['ip_address'],
        user_agent=request_info['user_agent'],
    )


@receiver(post_delete)
def audit_log_delete(sender, instance, **kwargs):
    if sender.__name__ in SILENT_MODELS or not _is_project_model(sender):
        return

    from .models import AuditLog
    user = get_authenticated_user()
    if not user:
        return

    request_info = get_request_info()

    AuditLog.objects.create(
        user=user,
        action='delete',
        entity=sender.__name__,
        entity_id=getattr(instance, 'id', None),
        old_values=_serialize_instance(instance),
        ip_address=request_info['ip_address'],
        user_agent=request_info['user_agent'],
    )


def _serialize_instance(instance):
    """Convert model instance to a JSON-serializable dict."""
    try:
        from django.forms.models import model_to_dict
        data = model_to_dict(instance)
        for k, v in data.items():
            if hasattr(v, 'pk'):
                data[k] = str(v)
        return json.loads(json.dumps(data, default=str))
    except Exception as e:
        logger.warning('audit serialization failed for %s', instance, exc_info=e)
        return {}
