from rest_framework import serializers
from apps.students.models import Promotion, Student
from .models import Application, ApplicationStatus, Invoice, Payment, Contract, Document, LibraryCategory

APPLICATION_STATUSES = [c[0] for c in ApplicationStatus.choices]


class ApplicationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    status = serializers.ChoiceField(choices=APPLICATION_STATUSES)

    class Meta:
        model = Application
        fields = ['id', 'application_number', 'student', 'student_name', 'status', 'submitted_at', 'reviewed_at', 'notes', 'interview_date', 'test_date', 'documents']

    def get_student_name(self, obj):
        return obj.student.full_name


class InvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)

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
    student = serializers.PrimaryKeyRelatedField(read_only=True)
    invoice = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'student', 'student_name', 'invoice', 'invoice_number', 'amount', 'currency', 'method', 'reference', 'notes', 'paid_at']

    def get_student_name(self, obj):
        return obj.student.full_name

    def validate_amount(self, value):
        if value is None or float(value) <= 0:
            raise serializers.ValidationError('Payment amount must be greater than zero.')
        return value


class LibraryCategorySerializer(serializers.ModelSerializer):
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = LibraryCategory
        fields = ['id', 'name', 'description', 'icon', 'color', 'sort_order', 'is_active', 'document_count']

    def get_document_count(self, obj):
        return getattr(obj, 'document_count', None) or obj.documents.count()


class DocumentSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    promotion_ids = serializers.PrimaryKeyRelatedField(
        source='promotions', many=True, read_only=False, queryset=Promotion.objects.all(), required=False
    )
    student_ids = serializers.PrimaryKeyRelatedField(
        source='individual_students', many=True, read_only=False, queryset=Student.objects.all(), required=False
    )
    is_expired = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'name', 'title_ar', 'title_fr', 'description', 'type', 'category',
            'category_name', 'library_category', 'file_url', 'mime_type', 'file_size',
            'version', 'version_history', 'status', 'expiry_date', 'download_count',
            'is_public', 'visible_to_roles', 'promotion_ids', 'student_ids',
            'uploaded_by_name', 'is_expired', 'can_manage', 'created_at', 'updated_at',
        ]

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by_id:
            return None
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.email

    def get_category_name(self, obj):
        return obj.library_category.name if obj.library_category_id else None

    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_can_manage(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        from .views import DocumentViewSet
        return DocumentViewSet._can_manage(request.user)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['promotions'] = data.pop('promotion_ids', [])
        data['individual_students'] = data.pop('student_ids', [])
        return data

    def to_internal_value(self, data):
        # Accept flat IDs for M2M relations
        if 'promotions' in data and not isinstance(data['promotions'], list):
            data = dict(data)
            data['promotions'] = [data['promotions']]
        if 'individual_students' in data and not isinstance(data['individual_students'], list):
            data = dict(data)
            data['individual_students'] = [data['individual_students']]
        return super().to_internal_value(data)


class ContractSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    contract_number = serializers.CharField(read_only=True)

    class Meta:
        model = Contract
        fields = ['id', 'contract_number', 'student', 'student_name', 'type', 'start_date', 'end_date', 'file_url', 'status', 'signed_at', 'created_at']

    def get_student_name(self, obj):
        return obj.student.full_name
