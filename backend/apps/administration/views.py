from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from apps.accounts.permissions import HasRolePermission
from .models import Application, Invoice, Payment, Contract, Document
from .serializers import ApplicationSerializer, InvoiceSerializer, PaymentSerializer, DocumentSerializer, ContractSerializer


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.select_related('student').all()
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'applications.view'
    filterset_fields = ['status', 'student']
    search_fields = ['application_number', 'student__first_name', 'student__last_name']

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        app = self.get_object()
        app.status = request.data.get('status', 'reviewed')
        app.reviewed_at = timezone.now()
        app.reviewed_by = request.user
        app.notes = request.data.get('notes', app.notes)
        app.save()
        return Response(ApplicationSerializer(app).data)


class InvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'invoicing.view'
    filterset_fields = ['status', 'student', 'currency']
    search_fields = ['invoice_number', 'student__first_name', 'student__last_name']

    def get_queryset(self):
        # Auto-mark past-due invoices as overdue before returning
        from django.db.models import Q
        overdue_candidates = Invoice.objects.filter(
            Q(status='draft') | Q(status='sent'),
            due_at__lt=timezone.now().date(),
        )
        if overdue_candidates.exists():
            overdue_candidates.update(status='overdue')

        qs = Invoice.objects.select_related('student').prefetch_related('payments').all()
        if self.request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        return qs

    serializer_class = InvoiceSerializer

    def perform_create(self, serializer):
        from django.conf import settings
        from apps.notifications.services import NotificationService
        year = timezone.now().year
        prefix = f'INV-{year}-'
        # Find the highest numeric invoice number for this year
        max_num = 0
        for inv in Invoice.objects.filter(invoice_number__startswith=prefix):
            try:
                suffix = inv.invoice_number[len(prefix):]
                # Only count purely numeric suffixes (skip A001, etc.)
                n = int(suffix)
                if n > max_num:
                    max_num = n
            except (ValueError, IndexError):
                pass
        num = max_num + 1
        invoice = serializer.save(invoice_number=settings.INVOICE_NUMBER_FORMAT.format(year=year, num=num))
        # Auto-notify student that a new invoice was created
        NotificationService.invoice_created(invoice)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        from django.utils import timezone as tz
        overdue_invoices = self.get_queryset().filter(
            status='overdue'
        ).order_by('-due_at')
        page = self.paginate_queryset(overdue_invoices)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(overdue_invoices, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def payments(self, request, pk=None):
        invoice = self.get_object()
        if request.method == 'GET':
            payments = invoice.payments.all().order_by('-paid_at')
            return Response(PaymentSerializer(payments, many=True).data)
        # POST: create a payment for this invoice
        data = {
            **request.data,
            'invoice': str(invoice.id),
            'student': str(invoice.student.id),
        }
        serializer = PaymentSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        # Re-fetch invoice to get fresh payments list (avoids stale queryset cache)
        invoice = Invoice.objects.prefetch_related('payments').get(id=invoice.id)
        paid = sum(float(p.amount) for p in invoice.payments.all())
        if paid >= float(invoice.amount):
            invoice.status = 'paid'
            invoice.paid_at = timezone.now()
        elif paid > 0:
            invoice.status = 'partially_paid'
        invoice.save(update_fields=['status', 'paid_at'] if invoice.status == 'paid' else ['status'])
        return Response(PaymentSerializer(payment).data, status=201)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('student', 'invoice').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'invoicing.view'
    filterset_fields = ['student', 'invoice', 'method', 'currency']

    def perform_create(self, serializer):
        from apps.notifications.services import NotificationService
        payment = serializer.save()
        # Auto-update invoice status
        invoice = payment.invoice
        if invoice:
            paid = sum(float(p.amount) for p in invoice.payments.all())
            was_overdue = invoice.status == 'overdue'
            if paid >= float(invoice.amount):
                invoice.status = 'paid'
                invoice.paid_at = timezone.now()
                invoice.save()
                # If was overdue and now paid, notify finance
                if was_overdue:
                    NotificationService.notify_roles(
                        ['finance_manager', 'system_admin'],
                        'payment_received',
                        'Overdue Invoice Paid',
                        f'Invoice #{invoice.invoice_number} ({invoice.student.full_name}) was overdue and is now fully paid.',
                        {'invoice_id': str(invoice.id), 'student': invoice.student.full_name}
                    )
            elif paid > 0:
                invoice.status = 'partially_paid'
                invoice.save()


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'documents.view'
    filterset_fields = ['type', 'category', 'status']
    search_fields = ['name']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        return qs

    @action(detail=False, methods=['post'])
    def upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)
        from django.core.files.storage import default_storage
        path = default_storage.save(f'documents/{file.name}', file)
        doc = Document.objects.create(
            name=request.data.get('name', file.name),
            file_url=path,
            type=request.data.get('type', 'other'),
            category=request.data.get('category', 'general'),
            mime_type=file.content_type,
            file_size=file.size,
            uploaded_by=request.user,
            student_id=request.data.get('student_id') or None,
        )
        return Response(DocumentSerializer(doc).data, status=201)


class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.select_related('student').all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'documents.view'
    filterset_fields = ['student', 'status', 'type']

    def perform_create(self, serializer):
        year = timezone.now().year
        last = Contract.objects.filter(contract_number__startswith=f'CTR-{year}-').order_by('-contract_number').first()
        num = 1
        if last:
            try:
                num = int(last.contract_number.split('-')[-1]) + 1
            except (ValueError, IndexError):
                num = 1
        serializer.save(contract_number=f'CTR-{year}-{num:04d}')

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        contract = self.get_object()
        # Generate a PDF contract from template
        from django.template.loader import render_to_string
        html = render_to_string('contracts/contract_template.html', {
            'contract': contract,
            'student': contract.student,
            'today': timezone.now().date(),
        })
        try:
            from weasyprint import HTML
            pdf = HTML(string=html).write_pdf()
            import os, uuid
            filename = f'contract-{contract.contract_number}.pdf'
            filepath = os.path.join(settings.MEDIA_ROOT, 'contracts', filename)
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'wb') as f:
                f.write(pdf)
            contract.file_url = f'/media/contracts/{filename}'
            contract.save()
            return Response({'file_url': contract.file_url, 'status': 'generated'})
        except ImportError:
            return Response({'error': 'PDF generation not available'}, status=501)
