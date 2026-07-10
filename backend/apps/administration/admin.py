from django.contrib import admin
from .models import Application, Invoice, Payment, Contract, Document


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['application_number', 'student', 'status', 'submitted_at']
    list_filter = ['status']
    search_fields = ['application_number', 'student__first_name', 'student__last_name']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'student', 'amount', 'currency', 'status', 'due_at']
    list_filter = ['status', 'currency']
    search_fields = ['invoice_number', 'student__first_name', 'student__last_name']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['student', 'invoice', 'amount', 'currency', 'method', 'paid_at']
    list_filter = ['method', 'currency']


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['contract_number', 'student', 'type', 'start_date', 'end_date', 'status']
    list_filter = ['status', 'type']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'category', 'version', 'status', 'created_at']
    list_filter = ['type', 'category', 'status']
    search_fields = ['name']
