from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Audit, NonConformity, CAPA, RiskAssessment, SafetyEvent, QualityDocument


@admin.register(Audit)
class AuditAdmin(ModelAdmin):
    list_display = ['title', 'type', 'scheduled_date', 'status', 'lead_auditor']
    list_filter = ['type', 'status']


@admin.register(NonConformity)
class NonConformityAdmin(ModelAdmin):
    list_display = ['title', 'audit', 'severity', 'status', 'due_date']
    list_filter = ['severity', 'status']


@admin.register(CAPA)
class CAPAAdmin(ModelAdmin):
    list_display = ['title', 'non_conformity', 'type', 'status', 'due_date']
    list_filter = ['type', 'status']


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(ModelAdmin):
    list_display = ['hazard', 'probability', 'severity', 'risk_level', 'status']
    list_filter = ['status']


@admin.register(SafetyEvent)
class SafetyEventAdmin(ModelAdmin):
    list_display = ['title', 'type', 'reported_by', 'confidential', 'status', 'created_at']
    list_filter = ['type', 'status', 'confidential']


@admin.register(QualityDocument)
class QualityDocumentAdmin(ModelAdmin):
    list_display = ['number', 'title', 'type', 'version', 'status']
    list_filter = ['type', 'status']
