"""Periodic tasks for administration."""
from celery import shared_task
from django.utils import timezone
from .models import Invoice


@shared_task
def check_overdue_invoices():
    """Mark issued invoices as overdue if past their due date and notify students."""
    from apps.notifications.services import NotificationService

    overdue = Invoice.objects.filter(status='issued', due_at__lt=timezone.now())
    count = 0
    for invoice in overdue:
        invoice.status = 'overdue'
        invoice.save(update_fields=['status'])
        # Notify the student about the overdue invoice
        NotificationService.notify(
            invoice.student.user,
            'invoice_overdue',
            'Invoice Overdue',
            f'Invoice #{invoice.invoice_number} for {invoice.amount} {invoice.currency} is now overdue.',
            {'invoice_id': str(invoice.id), 'amount': str(invoice.amount)}
        )
        # Also notify finance roles
        NotificationService.notify_roles(
            ['finance_responsible', 'accounting_agent', 'system_admin'],
            'invoice_overdue',
            'Invoice Overdue',
            f'Invoice #{invoice.invoice_number} ({invoice.student.full_name}) for {invoice.amount} {invoice.currency} is overdue.',
            {'invoice_id': str(invoice.id), 'student': invoice.student.full_name}
        )
        count += 1
    return f'{count} invoices marked as overdue and notifications sent'
