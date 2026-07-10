import json
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()


def get_request_info():
    """Try to extract IP and user-agent from the current request."""
    import inspect
    for frame_record in inspect.stack():
        frame = frame_record.frame
        request = frame.f_locals.get('request', None)
        if request and hasattr(request, 'META'):
            return {
                'ip_address': request.META.get('REMOTE_ADDR', ''),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500],
            }
    return {'ip_address': '', 'user_agent': ''}


def get_authenticated_user():
    """Try to find the authenticated user from thread locals or frame inspection."""
    import inspect
    for frame_record in inspect.stack():
        frame = frame_record.frame
        request = frame.f_locals.get('request', None)
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return request.user
    return None


@receiver(post_save)
def audit_log_save(sender, instance, created, **kwargs):
    if sender.__name__ == 'AuditLog' or sender.__name__ == 'Session':
        return

    from .models import AuditLog
    user = get_authenticated_user()
    if not user:
        return

    request_info = get_request_info()

    AuditLog.objects.create(
        user=user,
        action='create' if created else 'update',
        entity=sender.__name__,
        entity_id=getattr(instance, 'id', None),
        old_values=None if created else _get_changes(instance),
        new_values=_serialize_instance(instance) if created else _get_changes(instance),
        ip_address=request_info['ip_address'],
        user_agent=request_info['user_agent'],
    )


@receiver(post_delete)
def audit_log_delete(sender, instance, **kwargs):
    if sender.__name__ == 'AuditLog' or sender.__name__ == 'Session':
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
    except Exception:
        return {}


def _get_changes(instance):
    """Get changed fields for an update."""
    if not instance.pk:
        return {}
    try:
        changes = {}
        if hasattr(instance, 'tracker'):
            changes = instance.tracker.changed()
        return changes if changes else {}
    except Exception:
        return {}
