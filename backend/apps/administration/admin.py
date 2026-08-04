from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Application, Invoice, Payment, Contract, Document, LibraryCategory


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
    list_display = ['name', 'type', 'library_category', 'version', 'status', 'is_public', 'created_at']
    list_filter = ['type', 'library_category', 'status', 'is_public']
    search_fields = ['name', 'description']
    autocomplete_fields = ['user', 'student', 'uploaded_by', 'promotions', 'individual_students']
    date_hierarchy = 'created_at'
    fieldsets = (
        (None, {
            'fields': ('name', 'title_ar', 'title_fr', 'description', 'type', 'library_category', 'status'),
        }),
        ('File', {
            'fields': ('file_url', 'mime_type', 'file_size'),
        }),
        ('Visibility', {
            'fields': ('is_public', 'visible_to_roles', 'promotions', 'individual_students', 'expiry_date'),
        }),
        ('Versioning', {
            'fields': ('version', 'version_history'),
        }),
        ('Ownership', {
            'fields': ('user', 'student', 'uploaded_by'),
        }),
    )


@admin.register(LibraryCategory)
class LibraryCategoryAdmin(ModelAdmin):
    list_display = ['name', 'icon', 'color', 'sort_order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    list_editable = ['sort_order', 'is_active']
