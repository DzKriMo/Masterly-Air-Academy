"""Periodic tasks for administration."""
from celery import shared_task
from django.utils import timezone
from .models import Invoice


@shared_task
def check_overdue_invoices():
    """Mark issued invoices as overdue if past their due date."""
    overdue = Invoice.objects.filter(status='issued', due_at__lt=timezone.now())
    count = overdue.update(status='overdue')
    return f'{count} invoices marked as overdue'
