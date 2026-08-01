from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.utils import timezone
from apps.accounts.permissions import HasRolePermission
from apps.students.models import Student
from apps.exams.pdf import generate_invoice_pdf as _inv_pdf
from .models import Application, Invoice, Payment, Contract, Document
from .serializers import ApplicationSerializer, InvoiceSerializer, PaymentSerializer, DocumentSerializer, ContractSerializer


def refresh_invoice_status(invoice):
    """Reconcile an invoice's status from the sum of its recorded payments.

    Marks the invoice as 'paid' or 'partially_paid' based on the total paid
    amount, leaving draft/overdue transitions to the caller.
    """
    paid = sum(float(p.amount) for p in invoice.payments.all())
    if paid >= float(invoice.amount):
        if invoice.status != 'paid' or not invoice.paid_at:
            invoice.status = 'paid'
            invoice.paid_at = timezone.now()
            invoice.save(update_fields=['status', 'paid_at'])
    elif paid > 0 and invoice.status != 'partially_paid':
        invoice.status = 'partially_paid'
        invoice.save(update_fields=['status'])
    return paid


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.select_related('student').all()
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'applications.view'
    filterset_fields = ['status', 'student']
    search_fields = ['application_number', 'student__first_name', 'student__last_name']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(student__user=self.request.user)
        return qs

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        app = self.get_object()
        app.status = request.data.get('status', 'reviewed')
        app.reviewed_at = timezone.now()
        app.reviewed_by = request.user
        app.notes = request.data.get('notes', app.notes)
        app.interview_date = request.data.get('interview_date', app.interview_date)
        app.test_date = request.data.get('test_date', app.test_date)
        app.save()

        activate = request.data.get('activate_student', False)
        if activate and app.status == 'accepted':
            user = app.student.user
            if user.role == 'candidate':
                user.role = 'student'
                user.status = 'active'
                user.is_active = True
            email = request.data.get('student_email', '').strip()
            username = request.data.get('student_username', '').strip()
            password = request.data.get('student_password', '').strip()
            if email:
                user.email = email
            if username:
                user.username = username
            update_fields = ['role', 'status', 'is_active']
            if email:
                update_fields.append('email')
            if username:
                update_fields.append('username')
            if password:
                if len(password) < 8:
                    return Response({'error': 'Password must be at least 8 characters.'}, status=400)
                user.set_password(password)
                update_fields.append('password')
            user.save(update_fields=update_fields)

            student = app.student
            student.status = 'active'
            student.save(update_fields=['status'])

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
            Q(status='issued') | Q(status='partially_paid'),
            due_at__lt=timezone.now(),
        )
        if overdue_candidates.exists():
            # Reconcile payments first so fully-paid invoices are not marked overdue
            for invoice in overdue_candidates:
                refresh_invoice_status(invoice)
            overdue_candidates.filter(
                Q(status='issued') | Q(status='partially_paid'),
            ).update(status='overdue')

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
        from django.db import IntegrityError
        from apps.notifications.services import NotificationService
        year = timezone.now().year
        prefix = f'INV-{year}-'
        max_attempts = 10
        for attempt in range(max_attempts):
            # Find the highest numeric invoice number for this year
            max_num = 0
            for inv in Invoice.objects.filter(invoice_number__startswith=prefix):
                try:
                    suffix = inv.invoice_number[len(prefix):]
                    n = int(suffix)
                    if n > max_num:
                        max_num = n
                except (ValueError, IndexError):
                    pass
            num = max_num + 1
            try:
                invoice = serializer.save(invoice_number=settings.INVOICE_NUMBER_FORMAT.format(year=year, num=num))
                NotificationService.invoice_created(invoice)
                return
            except IntegrityError:
                if attempt == max_attempts - 1:
                    raise

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
        if request.user.role == 'student':
            return Response({'error': 'Permission denied'}, status=403)
        serializer = PaymentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(student=invoice.student, invoice=invoice)
        # Re-fetch invoice to get fresh payments list (avoids stale queryset cache)
        invoice = Invoice.objects.prefetch_related('payments').get(id=invoice.id)
        refresh_invoice_status(invoice)
        return Response(PaymentSerializer(payment).data, status=201)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('student', 'invoice').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'invoicing.view'
    filterset_fields = ['student', 'invoice', 'method', 'currency']

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

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied, ValidationError
        if self.request.user.role == 'student':
            raise PermissionDenied('Students cannot record payments')
        from apps.notifications.services import NotificationService
        student_id = self.request.data.get('student')
        invoice_id = self.request.data.get('invoice')
        if not student_id or not invoice_id:
            raise ValidationError({'detail': 'student and invoice are required'})
        payment = serializer.save(student_id=student_id, invoice_id=invoice_id)
        # Auto-update invoice status
        invoice = payment.invoice
        if invoice:
            was_overdue = invoice.status == 'overdue'
            refresh_invoice_status(invoice)
            if invoice.status == 'paid':
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
            elif invoice.status == 'partially_paid':
                invoice.save()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        from django.db.models import Sum
        qs = self.get_queryset()
        total = qs.aggregate(s=Sum('amount'))['s'] or 0
        now = timezone.now()
        this_month = qs.filter(paid_at__year=now.year, paid_at__month=now.month).aggregate(s=Sum('amount'))['s'] or 0
        by_method = {}
        for row in qs.values('method').annotate(s=Sum('amount')):
            by_method[row['method'] or 'other'] = round(float(row['s']), 2)
        return Response({
            'total_amount': round(float(total), 2),
            'this_month': round(float(this_month), 2),
            'by_method': by_method,
        })


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

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        doc = self.get_object()
        from django.core.files.storage import default_storage
        from django.http import StreamingHttpResponse
        try:
            f = default_storage.open(doc.file_url, 'rb')
            response = StreamingHttpResponse(f, content_type=doc.mime_type or 'application/octet-stream')
            response['Content-Disposition'] = f'inline; filename="{doc.name}"'
            return response
        except Exception:
            return Response({'error': 'File not found'}, status=404)

    @action(detail=False, methods=['post'])
    def upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        student_id = request.data.get('student_id')
        if request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=request.user)
                if student_id and str(student.id) != student_id:
                    return Response({'error': 'Cannot upload documents for other students'}, status=403)
                student_id = str(student.id)
            except Student.DoesNotExist:
                return Response({'error': 'Student profile not found'}, status=400)

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
            student_id=student_id or None,
        )
        return Response(DocumentSerializer(doc).data, status=201)


class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.select_related('student').all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'documents.view'
    filterset_fields = ['student', 'status', 'type']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(student__user=self.request.user)
        return qs

    def perform_create(self, serializer):
        from django.db import IntegrityError
        year = timezone.now().year
        prefix = f'CTR-{year}-'
        max_attempts = 10
        for attempt in range(max_attempts):
            last = Contract.objects.filter(contract_number__startswith=prefix).order_by('-contract_number').first()
            num = 1
            if last:
                try:
                    num = int(last.contract_number.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    num = 1
            try:
                serializer.save(contract_number=f'{prefix}{num:04d}')
                return
            except IntegrityError:
                if attempt == max_attempts - 1:
                    raise

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


class InvoicePdfView(APIView):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'invoicing.view'

    def get(self, request, inv_id):
        try:
            inv = Invoice.objects.get(id=inv_id)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=404)
        if request.user.role == 'student':
            try:
                student = Student.objects.get(user=request.user)
            except Student.DoesNotExist:
                return Response({'error': 'Student profile not found'}, status=404)
            if inv.student_id != student.id:
                return Response({'error': 'Permission denied'}, status=403)
        return _inv_pdf(inv)
