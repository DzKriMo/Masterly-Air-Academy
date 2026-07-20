from rest_framework import serializers
from .models import Application, Invoice, Payment, Contract, Document


class ApplicationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = ['id', 'application_number', 'student', 'student_name', 'status', 'submitted_at', 'reviewed_at', 'notes']

    def get_student_name(self, obj):
        return obj.student.full_name


class InvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'student', 'student_name', 'type', 'description', 'amount', 'currency', 'status', 'issued_at', 'due_at', 'paid_at', 'total_paid', 'balance']

    def get_student_name(self, obj):
        return obj.student.full_name

    def get_total_paid(self, obj):
        return sum(float(p.amount) for p in obj.payments.all())

    def get_balance(self, obj):
        paid = sum(float(p.amount) for p in obj.payments.all())
        return float(obj.amount) - paid


class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'student', 'student_name', 'invoice', 'invoice_number', 'amount', 'currency', 'method', 'reference', 'notes', 'paid_at']

    def get_student_name(self, obj):
        return obj.student.full_name


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'name', 'type', 'category', 'file_url', 'mime_type', 'file_size', 'version', 'status', 'created_at']


class ContractSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    contract_number = serializers.CharField(read_only=True)

    class Meta:
        model = Contract
        fields = ['id', 'contract_number', 'student', 'student_name', 'type', 'start_date', 'end_date', 'file_url', 'status', 'signed_at', 'created_at']

    def get_student_name(self, obj):
        return obj.student.full_name
