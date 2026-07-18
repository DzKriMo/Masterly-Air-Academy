from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Audit, NonConformity, CAPA, RiskAssessment, SafetyEvent, QualityDocument


class NCRInline(TabularInline):
    model = NonConformity
    extra = 0
    fields = ['title', 'severity', 'status']
    show_change_link = True


class CAPAInline(TabularInline):
    model = CAPA
    extra = 0
    fields = ['title', 'type', 'status', 'due_date']
    show_change_link = True


@admin.register(Audit)
class AuditAdmin(ModelAdmin):
    list_display = ['title', 'type', 'scheduled_date', 'status', 'lead_auditor']
    list_filter = ['type', 'status']
    search_fields = ['title', 'scope']
    autocomplete_fields = ['lead_auditor']
    date_hierarchy = 'scheduled_date'
    inlines = [NCRInline]
    fieldsets = (
        (None, {
            'fields': ('title', 'type', 'scope', 'status'),
        }),
        ('Schedule', {
            'fields': ('scheduled_date', 'completed_date'),
        }),
        ('Team', {
            'fields': ('lead_auditor', 'auditor_ids'),
        }),
        ('Checklist & Findings', {
            'fields': ('checklist_items', 'findings'),
        }),
        ('Report', {
            'fields': ('report_url',),
        }),
    )


@admin.register(NonConformity)
class NonConformityAdmin(ModelAdmin):
    list_display = ['title', 'audit', 'severity', 'status', 'responsible', 'due_date']
    list_filter = ['severity', 'status']
    search_fields = ['title', 'description']
    autocomplete_fields = ['audit', 'responsible']
    inlines = [CAPAInline]
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'severity', 'status'),
        }),
        ('Assignment', {
            'fields': ('audit', 'responsible', 'due_date'),
        }),
        ('Resolution', {
            'fields': ('root_cause', 'closing_notes', 'closed_at'),
        }),
    )


@admin.register(CAPA)
class CAPAAdmin(ModelAdmin):
    list_display = ['title', 'non_conformity', 'type', 'status', 'responsible', 'due_date']
    list_filter = ['type', 'status']
    search_fields = ['title', 'description']
    autocomplete_fields = ['non_conformity', 'responsible']
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'type', 'status'),
        }),
        ('Assignment', {
            'fields': ('non_conformity', 'responsible', 'due_date'),
        }),
        ('Closure', {
            'fields': ('validation_date', 'closing_notes'),
        }),
    )


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(ModelAdmin):
    list_display = ['hazard', 'probability', 'severity', 'risk_level', 'status', 'responsible']
    list_filter = ['status']
    search_fields = ['hazard', 'description']
    autocomplete_fields = ['responsible']
    readonly_fields = ['risk_level']
    fieldsets = (
        (None, {
            'fields': ('hazard', 'description', 'status'),
        }),
        ('Risk Rating', {
            'fields': ('probability', 'severity', 'risk_level'),
            'description': 'Risk Level = Probability × Severity (auto-calculated)',
        }),
        ('Mitigation', {
            'fields': ('mitigation_measures', 'responsible', 'reeval_date'),
        }),
    )


@admin.register(SafetyEvent)
class SafetyEventAdmin(ModelAdmin):
    list_display = ['title', 'type', 'reported_by', 'confidential', 'status', 'created_at']
    list_filter = ['type', 'status', 'confidential']
    search_fields = ['title', 'description']
    autocomplete_fields = ['reported_by']
    date_hierarchy = 'created_at'
    fieldsets = (
        (None, {
            'fields': ('title', 'type', 'description', 'confidential', 'status'),
        }),
        ('Analysis', {
            'fields': ('analysis',),
        }),
        ('Attachments', {
            'fields': ('attachments',),
        }),
        ('Closure', {
            'fields': ('closed_at',),
        }),
    )


@admin.register(QualityDocument)
class QualityDocumentAdmin(ModelAdmin):
    list_display = ['number', 'title', 'type', 'version', 'status', 'revision_date']
    list_filter = ['type', 'status']
    search_fields = ['number', 'title']
    autocomplete_fields = ['author', 'approver']
    fieldsets = (
        (None, {
            'fields': ('number', 'title', 'type', 'version', 'status'),
        }),
        ('Dates', {
            'fields': ('issue_date', 'revision_date'),
        }),
        ('Approval', {
            'fields': ('author', 'approver'),
        }),
        ('File & History', {
            'fields': ('file_url', 'version_history'),
        }),
    )
