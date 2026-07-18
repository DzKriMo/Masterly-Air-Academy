import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class Audit(models.Model):
    AUDIT_TYPE_CHOICES = [
        ('internal', 'Internal'),
        ('regulatory', 'Regulatory'),
        ('supplier', 'Supplier'),
        ('pedagogical', 'Pedagogical'),
        ('safety', 'Safety'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=30, choices=AUDIT_TYPE_CHOICES)
    scope = models.TextField(blank=True, null=True)
    scheduled_date = models.DateTimeField()
    completed_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='planned')
    lead_auditor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='led_audits')
    auditor_ids = models.JSONField(default=list, blank=True)
    checklist_items = models.JSONField(default=list, blank=True)
    findings = models.JSONField(default=list, blank=True)
    report_url = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'audits'
        ordering = ['-scheduled_date']
        verbose_name = 'Audit'
        verbose_name_plural = 'Audits'

    def __str__(self):
        return self.title


class NonConformity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audit = models.ForeignKey(Audit, on_delete=models.SET_NULL, null=True, related_name='non_conformities')
    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=20)
    ncr_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    responsible = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='assigned_ncrs')
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='open')
    root_cause = models.TextField(blank=True, null=True)
    closing_notes = models.TextField(blank=True, null=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'non_conformities'
        verbose_name = 'Non-Conformity'
        verbose_name_plural = 'Non-Conformities'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.ncr_number:
            self.ncr_number = self._generate_number()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_number():
        year = timezone.now().year
        from django.db.models import Max
        prefix = f'NCR-{year}-'
        max_num = NonConformity.objects.filter(ncr_number__startswith=prefix).aggregate(m=Max('ncr_number'))['m']
        if max_num:
            seq = int(max_num.split('-')[-1]) + 1
        else:
            seq = 1
        return f'NCR-{year}-{seq:04d}'


class CAPA(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    non_conformity = models.ForeignKey(NonConformity, on_delete=models.SET_NULL, null=True, related_name='capas')
    type = models.CharField(max_length=20, help_text='corrective or preventive')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    capa_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    responsible = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='open')
    validation_date = models.DateTimeField(null=True, blank=True)
    closing_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'capas'
        verbose_name = 'CAPA'
        verbose_name_plural = 'CAPAs'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.capa_number:
            self.capa_number = self._generate_number()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_number():
        year = timezone.now().year
        from django.db.models import Max
        prefix = f'CAPA-{year}-'
        max_num = CAPA.objects.filter(capa_number__startswith=prefix).aggregate(m=Max('capa_number'))['m']
        if max_num:
            seq = int(max_num.split('-')[-1]) + 1
        else:
            seq = 1
        return f'CAPA-{year}-{seq:04d}'


class RiskAssessment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hazard = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    probability = models.IntegerField(help_text='1-5 scale')
    severity = models.IntegerField(help_text='1-5 scale')
    risk_level = models.IntegerField(editable=False, default=1)
    mitigation_measures = models.TextField(blank=True, null=True)
    responsible = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    reeval_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'risk_assessments'
        ordering = ['-risk_level']

    def save(self, *args, **kwargs):
        self.risk_level = self.probability * self.severity
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.hazard} (Risk: {self.risk_level})'


class SafetyEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=50)
    description = models.TextField()
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reported_safety_events')
    confidential = models.BooleanField(default=False)
    attachments = models.JSONField(default=list, blank=True)
    analysis = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, default='reported')
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'safety_events'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class QualityDocument(models.Model):
    class DocStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        IN_REVISION = 'in_revision', 'In Revision'
        APPROVED = 'approved', 'Approved'
        ARCHIVED = 'archived', 'Archived'
        EXPIRED = 'expired', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=50, blank=True, null=True)
    version = models.CharField(max_length=20, blank=True, null=True)
    issue_date = models.DateField(null=True, blank=True)
    revision_date = models.DateField(null=True, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='authored_qdocs')
    approver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='approved_qdocs')
    status = models.CharField(max_length=20, choices=DocStatus.choices, default=DocStatus.DRAFT)
    file_url = models.CharField(max_length=500, blank=True, null=True)
    version_history = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'quality_documents'
        verbose_name = 'Quality Document'
        verbose_name_plural = 'Quality Documents'

    def __str__(self):
        return f'{self.number} - {self.title}'
