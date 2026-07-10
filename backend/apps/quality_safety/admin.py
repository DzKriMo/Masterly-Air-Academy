from django.contrib import admin
from .models import Audit, NonConformity, CAPA, RiskAssessment, SafetyEvent, QualityDocument


@admin.register(Audit)
class AuditAdmin(admin.ModelAdmin):
    list_display = ['title', 'type', 'scheduled_date', 'status', 'lead_auditor']
    list_filter = ['type', 'status']


@admin.register(NonConformity)
class NonConformityAdmin(admin.ModelAdmin):
    list_display = ['title', 'audit', 'severity', 'status', 'due_date']
    list_filter = ['severity', 'status']


@admin.register(CAPA)
class CAPAAdmin(admin.ModelAdmin):
    list_display = ['title', 'non_conformity', 'type', 'status', 'due_date']
    list_filter = ['type', 'status']


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ['hazard', 'probability', 'severity', 'risk_level', 'status']
    list_filter = ['status']


@admin.register(SafetyEvent)
class SafetyEventAdmin(admin.ModelAdmin):
    list_display = ['title', 'type', 'reported_by', 'confidential', 'status', 'created_at']
    list_filter = ['type', 'status', 'confidential']


@admin.register(QualityDocument)
class QualityDocumentAdmin(admin.ModelAdmin):
    list_display = ['number', 'title', 'type', 'version', 'status']
    list_filter = ['type', 'status']
