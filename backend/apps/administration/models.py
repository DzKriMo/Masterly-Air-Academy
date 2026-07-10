import uuid
from django.conf import settings
from django.db import models


class InvoiceStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    ISSUED = 'issued', 'Issued'
    PAID = 'paid', 'Paid'
    PARTIALLY_PAID = 'partially_paid', 'Partially Paid'
    OVERDUE = 'overdue', 'Overdue'
    CANCELLED = 'cancelled', 'Cancelled'


class Application(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application_number = models.CharField(max_length=50, unique=True)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=30, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    interview_date = models.DateTimeField(null=True, blank=True)
    test_date = models.DateTimeField(null=True, blank=True)
    documents = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'applications'
        ordering = ['-submitted_at']

    def __str__(self):
        return f'Application #{self.application_number} - {self.student.full_name}'


class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='invoices')
    type = models.CharField(max_length=30, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='MAD')
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT)
    issued_at = models.DateTimeField(null=True, blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']

    def __str__(self):
        return f'Invoice #{self.invoice_number} - {self.amount} {self.currency}'


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='payments')
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='MAD')
    method = models.CharField(max_length=30, blank=True, null=True)
    reference = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    paid_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-paid_at']

    def __str__(self):
        return f'Payment {self.amount} {self.currency} - {self.student.full_name}'


class Contract(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='contracts')
    contract_number = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=30, blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    file_url = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=20, default='active')
    signed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contracts'

    def __str__(self):
        return f'Contract #{self.contract_number}'


class Document(models.Model):
    class DocumentStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        IN_REVISION = 'in_revision', 'In Revision'
        APPROVED = 'approved', 'Approved'
        ARCHIVED = 'archived', 'Archived'
        EXPIRED = 'expired', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    student = models.ForeignKey('students.Student', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents')
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50, blank=True, null=True)
    category = models.CharField(max_length=50, blank=True, null=True)
    file_url = models.CharField(max_length=500)
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    file_size = models.IntegerField(null=True, blank=True)
    version = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.APPROVED)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_documents')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']

    def __str__(self):
        return self.name
