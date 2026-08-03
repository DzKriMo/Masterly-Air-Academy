"""Celery tasks for notification delivery and retention."""
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone


@shared_task
def send_email_notification_task(user_id, subject, message):
    """Send an email notification asynchronously (called from NotificationService)."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user = User.objects.filter(id=user_id, is_active=True).first()
    if not user or not user.email:
        return 'skip'
    try:
        html_message = render_to_string('emails/notification.html', {
            'subject': subject,
            'message': message,
        })
        text_message = render_to_string('emails/notification.txt', {
            'subject': subject,
            'message': message,
        })
        send_mail(
            subject=subject,
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )
        return 'sent'
    except Exception:
        return 'error'


@shared_task
def cleanup_old_notifications(days=90):
    """Delete read notifications older than `days` to control table growth."""
    from .models import Notification
    cutoff = timezone.now() - timezone.timedelta(days=days)
    deleted, _ = Notification.objects.filter(is_read=True, created_at__lt=cutoff).delete()
    return f'deleted {deleted} old read notifications'
