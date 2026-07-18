from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Application, Invoice, Payment, Contract, Document


class PaymentInline(TabularInline):
    model = Payment
    extra = 0
    fields = ['amount', 'currency', 'method', 'reference', 'paid_at']
    readonly_fields = ['paid_at']


@admin.register(Application)
class ApplicationAdmin(ModelAdmin):
    list_display = ['application_number', 'student', 'status', 'submitted_at', 'reviewed_at']
    list_filter = ['status']
    search_fields = ['application_number', 'student__first_name', 'student__last_name']
    autocomplete_fields = ['student', 'reviewed_by']
    date_hierarchy = 'submitted_at'
    fieldsets = (
        (None, {
            'fields': ('application_number', 'student', 'status'),
        }),
        ('Review', {
            'fields': ('reviewed_by', 'reviewed_at', 'notes'),
        }),
        ('Schedule', {
            'fields': ('interview_date', 'test_date'),
        }),
        ('Documents', {
            'fields': ('documents',),
        }),
    )


@admin.register(Invoice)
class InvoiceAdmin(ModelAdmin):
    list_display = ['invoice_number', 'student', 'amount', 'currency', 'status', 'due_at', 'paid_at']
    list_filter = ['status', 'currency']
    search_fields = ['invoice_number', 'student__first_name', 'student__last_name']
    autocomplete_fields = ['student']
    date_hierarchy = 'created_at'
    inlines = [PaymentInline]
    fieldsets = (
        (None, {
            'fields': ('invoice_number', 'student', 'type', 'status'),
        }),
        ('Amount', {
            'fields': ('amount', 'currency'),
        }),
        ('Dates', {
            'fields': ('issued_at', 'due_at', 'paid_at'),
        }),
        ('Notes', {
            'fields': ('description', 'notes'),
        }),
    )


@admin.register(Payment)
class PaymentAdmin(ModelAdmin):
    list_display = ['student', 'invoice', 'amount', 'currency', 'method', 'paid_at']
    list_filter = ['method', 'currency']
    search_fields = ['student__first_name', 'student__last_name', 'reference']
    autocomplete_fields = ['student', 'invoice', 'recorded_by']
    date_hierarchy = 'paid_at'


@admin.register(Contract)
class ContractAdmin(ModelAdmin):
    list_display = ['contract_number', 'student', 'type', 'start_date', 'end_date', 'status']
    list_filter = ['status', 'type']
    search_fields = ['contract_number', 'student__first_name', 'student__last_name']
    autocomplete_fields = ['student']
    date_hierarchy = 'start_date'
    fieldsets = (
        (None, {
            'fields': ('contract_number', 'student', 'type', 'status'),
        }),
        ('Dates', {
            'fields': ('start_date', 'end_date', 'signed_at'),
        }),
        ('File', {
            'fields': ('file_url',),
        }),
    )


@admin.register(Document)
class DocumentAdmin(ModelAdmin):
    list_display = ['name', 'type', 'category', 'version', 'status', 'created_at']
    list_filter = ['type', 'category', 'status']
    search_fields = ['name']
    autocomplete_fields = ['user', 'student', 'uploaded_by']
    date_hierarchy = 'created_at'
    fieldsets = (
        (None, {
            'fields': ('name', 'type', 'category', 'status'),
        }),
        ('File', {
            'fields': ('file_url', 'mime_type', 'file_size'),
        }),
        ('Versioning', {
            'fields': ('version',),
        }),
        ('Ownership', {
            'fields': ('user', 'student', 'uploaded_by'),
        }),
    )
