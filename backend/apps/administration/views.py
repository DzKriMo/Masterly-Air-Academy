from rest_framework import viewsets, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings
from django.utils import timezone
from django.db.models import Count, Q
from apps.accounts.authentication import SignedMediaAuthentication
from apps.accounts.cookie_auth import CookieJWTAuthentication
from apps.accounts.permissions import HasRolePermission, user_has_domain_permission
from apps.students.models import Student, Promotion
from apps.exams.pdf import generate_invoice_pdf as _inv_pdf
from .models import Application, Invoice, Payment, Contract, Document, LibraryCategory
from .serializers import (
    ApplicationSerializer, InvoiceSerializer, PaymentSerializer,
    DocumentSerializer, ContractSerializer, LibraryCategorySerializer,
)


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
        if not user_has_domain_permission(request.user, 'applications', 'approve'):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        from .serializers import APPLICATION_STATUSES
        status_val = request.data.get('status')
        if status_val is not None and status_val not in APPLICATION_STATUSES:
            return Response({'error': f'Invalid status: {status_val}'}, status=status.HTTP_400_BAD_REQUEST)
        app = self.get_object()
        app.status = status_val or 'reviewed'
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
            student_fields = ['status']
            if not student.promotion_id:
                from apps.students.models import Promotion
                promo = Promotion.objects.filter(program=student.program, status='in_progress').order_by('-start_date').first()
                if not promo:
                    from apps.students.models import PromotionStatus
                    year = timezone.now().year
                    base = f'{student.program}-{year}-'
                    letter_index = Promotion.objects.filter(code__startswith=base).count()
                    letter = chr(ord('A') + letter_index)
                    promo = Promotion.objects.create(
                        code=f'{base}{letter}',
                        program=student.program,
                        name=f'{student.program} {year} {letter}',
                        start_date=timezone.now().date(),
                        status=PromotionStatus.IN_PROGRESS,
                    )
                student.promotion = promo
                student_fields.append('promotion')
            if student.student_number.startswith(('APP-', 'AP-')):
                student.student_number = student.generate_student_number()
                student_fields.append('student_number')
            student.save(update_fields=student_fields)

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
        from django.db import IntegrityError, transaction
        from apps.notifications.services import NotificationService
        year = timezone.now().year
        prefix = f'INV-{year}-'
        max_attempts = 10
        for attempt in range(max_attempts):
            with transaction.atomic():
                max_num = 0
                for inv in Invoice.objects.select_for_update().filter(invoice_number__startswith=prefix):
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
        try:
            invoice = Invoice.objects.get(pk=invoice_id)
        except Invoice.DoesNotExist:
            raise ValidationError({'detail': 'Invoice not found'})
        amount = float(serializer.validated_data.get('amount'))
        balance = float(invoice.amount) - sum(float(p.amount) for p in invoice.payments.all())
        if amount > balance:
            raise ValidationError({'detail': 'Payment amount cannot exceed the invoice balance.'})
        payment = serializer.save(student_id=student_id, invoice_id=invoice_id)
        # Notify the student that a payment was recorded
        try:
            NotificationService.notify(
                payment.student.user,
                'payment_received',
                'Payment Recorded',
                f'A payment of {payment.amount} {payment.currency or "DZD"} has been recorded'
                + (f' for invoice #{payment.invoice.invoice_number}' if payment.invoice else '') + '.',
                {'payment_id': str(payment.id), 'amount': str(payment.amount),
                 'invoice_id': str(payment.invoice_id) if payment.invoice_id else None}
            )
        except Exception:
            pass
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
                        ['finance_responsible', 'accounting_agent', 'system_admin'],
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
    authentication_classes = [
        SignedMediaAuthentication,
        SessionAuthentication,
        JWTAuthentication,
        CookieJWTAuthentication,
    ]
    filterset_fields = ['type', 'category', 'status', 'library_category']
    search_fields = ['name', 'description']

    @staticmethod
    def _can_manage(user):
        """Library managers: system_admin, training_admin, admin_responsible,
        admissions_responsible (via documents.manage) and anyone holding manage."""
        if user.role == 'system_admin' or user.is_superuser:
            return True
        if user.role in ('training_admin', 'admin_responsible', 'admissions_responsible'):
            return True
        perms = user.get_all_permissions()
        return any(
            p.endswith('.documents.manage') or p.endswith('.documents.create')
            for p in perms
        )

    def _visible_queryset(self, qs):
        """Restrict documents to those visible to the requesting user.

        Library items are visible when public, or when the user's role is in
        visible_to_roles, or (for students) their promotion / individual
        targeting matches. Expired documents are hidden from non-managers.
        Managers see everything.
        """
        user = self.request.user
        if self._can_manage(user):
            return qs

        student = getattr(user, 'student_profile', None)

        def _matches(doc):
            if doc.is_public:
                return True
            if user.role in (doc.visible_to_roles or []):
                return True
            if student is not None:
                promo_ids = [p.id for p in doc.promotions.all()]
                if student.promotion_id and student.promotion_id in promo_ids:
                    return True
                stu_ids = [s.id for s in doc.individual_students.all()]
                if student.id in stu_ids:
                    return True
                if doc.student_id == student.id:
                    return True
            return False

        now = timezone.now()
        visible = [
            d.id for d in qs
            if _matches(d) and (d.expiry_date is None or d.expiry_date >= now)
        ]
        return qs.filter(id__in=visible)

    def get_queryset(self):
        qs = Document.objects.annotate(
            _view_count=Count('individual_students', distinct=True)
        ).select_related('library_category', 'uploaded_by').prefetch_related('promotions', 'individual_students')
        return self._visible_queryset(qs)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'])
    def categories(self, request):
        qs = LibraryCategory.objects.annotate(
            document_count=Count('documents', distinct=True)
        ).filter(is_active=True)
        serializer = LibraryCategorySerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_category(self, request):
        if not self._can_manage(request.user):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        serializer = LibraryCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        return Response(LibraryCategorySerializer(category).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        doc = self.get_object()
        from django.core.files.storage import default_storage
        from django.http import StreamingHttpResponse
        try:
            f = default_storage.open(doc.file_url, 'rb')
            response = StreamingHttpResponse(f, content_type=doc.mime_type or 'application/octet-stream')
            safe_name = doc.name.replace('"', '')
            response['Content-Disposition'] = f'inline; filename="{safe_name}"'
            Document.objects.filter(id=doc.id).update(download_count=doc.download_count + 1)
            return response
        except Exception:
            return Response({'error': 'File not found'}, status=404)

    @action(detail=True, methods=['get'], url_path='stream')
    def stream(self, request, pk=None):
        """Stream a media file (video/image/pdf) so it plays/previews in-browser."""
        doc = self.get_object()
        from apps.ground_training.views import _stream_from_storage
        inline = (doc.mime_type or '').startswith(('video/', 'image/', 'application/pdf'))
        response = _stream_from_storage(
            doc.file_url,
            content_type=doc.mime_type or 'application/octet-stream',
            filename=doc.name.replace('"', ''),
            inline=inline,
            request=request,
        )
        if response is None:
            return Response({'error': 'File not found'}, status=404)
        return response

    @action(detail=True, methods=['post'])
    def reupload(self, request, pk=None):
        """Replace the file for an existing document, bumping the version."""
        if not self._can_manage(request.user):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        doc = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        from apps.ground_training.views import _store_upload
        from apps.core.uploads import validate_upload
        ok, err = validate_upload(file)
        if not ok:
            return Response({'error': err}, status=400)
        path = _store_upload('library', file)

        history = list(doc.version_history or [])
        history.append({
            'version': doc.version,
            'file_url': doc.file_url,
            'file_size': doc.file_size,
            'mime_type': doc.mime_type,
            'uploaded_by': str(doc.uploaded_by_id) if doc.uploaded_by_id else None,
            'created_at': doc.updated_at.isoformat() if doc.updated_at else None,
        })
        doc.file_url = path
        doc.file_size = file.size
        doc.mime_type = file.content_type
        doc.version = (doc.version or 1) + 1
        doc.version_history = history
        doc.uploaded_by = request.user
        doc.save()
        return Response(DocumentSerializer(doc, context=self.get_serializer_context()).data)

    @action(detail=False, methods=['post'])
    def upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        # Students may only upload personal documents for themselves; all
        # library (shared) uploads require manager permission.
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

        if not student_id and not self._can_manage(request.user):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        from apps.ground_training.views import _store_upload
        from apps.core.uploads import validate_upload
        ok, err = validate_upload(file)
        if not ok:
            return Response({'error': err}, status=400)
        path = _store_upload('library', file)

        category = None
        category_id = request.data.get('library_category') or request.data.get('category_id')
        if category_id:
            category = LibraryCategory.objects.filter(id=category_id).first()
        elif request.data.get('new_category'):
            category, _ = LibraryCategory.objects.get_or_create(
                name=request.data['new_category'],
                defaults={'description': request.data.get('category_description', '')},
            )

        # Parse multi-value fields
        def parse_list(key):
            raw = request.data.get(key)
            if raw is None:
                return []
            if isinstance(raw, (list, tuple)):
                return [v for v in raw if v]
            return [v.strip() for v in str(raw).split(',') if v.strip()]

        role_values = parse_list('visible_to_roles')
        promotion_ids = parse_list('promotions')
        student_ids = parse_list('individual_students')

        expiry_raw = request.data.get('expiry_date')
        expiry = None
        if expiry_raw:
            try:
                expiry = timezone.datetime.fromisoformat(str(expiry_raw).replace('Z', '+00:00'))
            except (ValueError, TypeError):
                expiry = None

        doc = Document.objects.create(
            name=request.data.get('name', file.name),
            title_ar=request.data.get('title_ar') or None,
            title_fr=request.data.get('title_fr') or None,
            description=request.data.get('description') or None,
            file_url=path,
            type=request.data.get('type', 'other'),
            library_category=category,
            mime_type=file.content_type,
            file_size=file.size,
            uploaded_by=request.user,
            student_id=student_id or None,
            is_public=request.data.get('is_public') not in (None, '', 'false', 'False', '0', 'off'),
            visible_to_roles=role_values,
            expiry_date=expiry,
        )
        if promotion_ids:
            doc.promotions.set(Promotion.objects.filter(id__in=promotion_ids))
        if student_ids:
            doc.individual_students.set(Student.objects.filter(id__in=student_ids))
        return Response(DocumentSerializer(doc, context=self.get_serializer_context()).data, status=201)


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
                contract = serializer.save(contract_number=f'{prefix}{num:04d}')
                try:
                    from apps.notifications.services import NotificationService
                    NotificationService.notify(
                        contract.student.user,
                        'contract_signed',
                        'Contract Signed',
                        f'Contract #{contract.contract_number} has been signed and recorded.',
                        {'contract_id': str(contract.id), 'number': contract.contract_number}
                    )
                except Exception:
                    pass
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
