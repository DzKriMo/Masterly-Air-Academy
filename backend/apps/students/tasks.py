"""Periodic tasks for students."""
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import MedicalCertificate


@shared_task
def check_expiring_medicals():
    """Notify about medical certificates expiring within the notice period."""
    soon = timezone.now().date() + timedelta(days=settings.MEDICAL_EXPIRY_NOTICE_DAYS)
    expiring = MedicalCertificate.objects.filter(expiry_date__lte=soon, expiry_date__gte=timezone.now().date(), status='valid')
    from apps.notifications.models import Notification
    count = 0
    for cert in expiring:
        Notification.objects.create(
            user=cert.student.user, type='warning',
            title='Medical Certificate Expiring',
            message=f'Your medical certificate expires on {cert.expiry_date}. Please renew it soon.',
        )
        count += 1
    return f'{count} medical expiry notifications sent'
