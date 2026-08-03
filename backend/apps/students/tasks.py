"""Periodic tasks for students."""
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import MedicalCertificate


@shared_task
def check_expiring_medicals():
    """Notify about medical certificates expiring within the notice period."""
    from apps.notifications.services import NotificationService
    soon = timezone.now().date() + timedelta(days=settings.MEDICAL_EXPIRY_NOTICE_DAYS)
    expiring = MedicalCertificate.objects.filter(expiry_date__lte=soon, expiry_date__gte=timezone.now().date(), status='valid')
    count = 0
    for cert in expiring:
        NotificationService.document_expiring(
            cert.student.user,
            'Medical Certificate',
            cert.certificate_number or 'Medical Certificate',
            cert.expiry_date,
        )
        count += 1
    return f'{count} medical expiry notifications sent'
