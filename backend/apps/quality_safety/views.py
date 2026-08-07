from django.db.models import Count
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.permissions import HasRolePermission
from apps.notifications.services import NotificationService
from .models import Audit, NonConformity, CAPA, RiskAssessment, SafetyEvent, QualityDocument
from .serializers import (
    AuditSerializer, NonConformitySerializer, CAPASerializer,
    RiskAssessmentSerializer, SafetyEventSerializer, QualityDocumentSerializer,
)
from .services import DeadlineMonitorService


class AuditViewSet(viewsets.ModelViewSet):
    queryset = Audit.objects.select_related('lead_auditor').prefetch_related('non_conformities').annotate(
        ncr_count=Count('non_conformities', distinct=True)
    ).all()
    serializer_class = AuditSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'
    filterset_fields = ['type', 'status']

    @action(detail=True, methods=['post'])
    def plan(self, request, pk=None):
        """Set audit status to 'planned' and notify the lead auditor."""
        audit = self.get_object()
        audit.status = 'planned'
        audit.save()

        if audit.lead_auditor:
            NotificationService.notify(
                audit.lead_auditor,
                'audit_planned',
                'Audit Planned',
                f"You have been assigned as lead auditor for: {audit.title}",
                {'audit_id': str(audit.id)},
            )

        return Response(AuditSerializer(audit).data)

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Set audit status to 'in_progress'."""
        audit = self.get_object()
        audit.status = 'in_progress'
        audit.save()
        return Response(AuditSerializer(audit).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete an audit.

        Only quality_manager and compliance_monitoring_manager roles may
        complete. Sets completed_date, generates a report_url, and
        auto-creates NonConformity records from the findings JSON list.
        """
        user = request.user
        if user.role not in ('quality_manager', 'compliance_monitoring_manager') and not user.is_superuser:
            return Response(
                {'detail': 'Only Quality Manager or CMM can complete audits.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        audit = self.get_object()
        audit.status = 'completed'
        audit.completed_date = timezone.now()
        audit.findings = request.data.get('findings', audit.findings)
        audit.save()

        # Auto-create NCRs from findings if findings is a list
        findings = audit.findings
        if isinstance(findings, list):
            ncr_created = 0
            for finding in findings:
                NonConformity.objects.create(
                    audit=audit,
                    title=finding.get('title', 'Audit Finding'),
                    description=finding.get('description', ''),
                    severity=finding.get('severity', 'medium'),
                    responsible_id=finding.get('responsible'),
                    due_date=finding.get('due_date', None),
                    status='open',
                )
                ncr_created += 1
        else:
            ncr_created = 0

        # Notify quality roles that audit is complete
        NotificationService.notify_roles(
            ['quality_manager', 'compliance_monitoring_manager', 'safety_manager'],
            'audit_completed',
            'Audit Completed',
            f"Audit '{audit.title}' has been completed with {ncr_created} NCR(s).",
            {'audit_id': str(audit.id), 'ncr_count': ncr_created},
        )

        return Response(AuditSerializer(audit).data)


class NonConformityViewSet(viewsets.ModelViewSet):
    queryset = NonConformity.objects.select_related('audit', 'responsible').prefetch_related('capas').annotate(
        capa_count=Count('capas', distinct=True)
    ).all()
    serializer_class = NonConformitySerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'
    filterset_fields = ['audit', 'severity', 'status']

    def perform_create(self, serializer):
        ncr = serializer.save()
        NotificationService.ncr_opened(ncr)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close an NCR.

        Requires root_cause to be filled. All linked CAPAs must be in
        'closed' status before the NCR can be closed. Auto-notifies
        quality roles upon closure.
        """
        ncr = self.get_object()

        root_cause = request.data.get('root_cause', '').strip()
        if not root_cause:
            return Response(
                {'detail': 'Root cause must be provided before closing an NCR.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate that all linked CAPAs are validated (closed)
        open_capas = ncr.capas.exclude(status='closed')
        if open_capas.exists():
            return Response(
                {
                    'detail': (
                        'All linked CAPAs must be closed before the NCR can be '
                        f'closed. {open_capas.count()} CAPA(s) still open.'
                    ),
                    'open_capa_ids': [str(c.id) for c in open_capas],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ncr.status = 'closed'
        ncr.root_cause = root_cause
        ncr.closing_notes = request.data.get('closing_notes', ncr.closing_notes)
        ncr.closed_at = timezone.now()
        ncr.save()

        NotificationService.notify_roles(
            ['quality_manager', 'compliance_monitoring_manager', 'safety_manager'],
            'ncr_closed',
            'NCR Closed',
            f"NCR '{ncr.title}' has been closed.",
            {'ncr_id': str(ncr.id)},
        )

        return Response(NonConformitySerializer(ncr).data)


class CAPAViewSet(viewsets.ModelViewSet):
    queryset = CAPA.objects.select_related('non_conformity', 'responsible').all()
    serializer_class = CAPASerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'
    filterset_fields = ['type', 'status']

    def perform_create(self, serializer):
        capa = serializer.save()
        NotificationService.capa_assigned(capa)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close a CAPA.

        Requires closing_notes to be filled. Sets validation_date to now.
        """
        capa = self.get_object()

        closing_notes = request.data.get('closing_notes', '').strip()
        if not closing_notes:
            return Response(
                {'detail': 'Closing notes must be provided before closing a CAPA.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        capa.status = 'closed'
        capa.closing_notes = closing_notes
        capa.validation_date = timezone.now()
        capa.save()

        return Response(CAPASerializer(capa).data)


class RiskAssessmentViewSet(viewsets.ModelViewSet):
    queryset = RiskAssessment.objects.all()
    serializer_class = RiskAssessmentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'safety.view'
    filterset_fields = ['status']
    ordering_fields = ['risk_level']

    @action(detail=False, methods=['get'])
    def matrix(self, request):
        """Return risk matrix data: 5x5 grid with counts per cell."""
        assessments = self.get_queryset()
        matrix = [[0] * 5 for _ in range(5)]
        for ra in assessments:
            prob = ra.probability
            sev = ra.severity
            if not prob or not sev:
                continue
            prob = min(max(prob, 1), 5)
            sev = min(max(sev, 1), 5)
            matrix[prob - 1][sev - 1] += 1
        return Response({'matrix': matrix, 'total': assessments.count()})


class SafetyEventViewSet(viewsets.ModelViewSet):
    queryset = SafetyEvent.objects.select_related('reported_by').all()
    serializer_class = SafetyEventSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'safety.view'
    filterset_fields = ['type', 'status']

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def report(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(reported_by=request.user, status='reported')
        # Notify safety roles of the new event
        try:
            NotificationService.notify_roles(
                ['safety_manager', 'quality_manager', 'compliance_monitoring_manager'],
                'safety_event',
                'New Safety Event',
                f'Safety event reported: {event.title}',
                {'event_id': str(event.id)},
            )
        except Exception:
            pass
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def upload(self, request):
        """Upload an attachment (image/document) and return its /media/ URL."""
        from apps.ground_training.views import _store_upload
        from apps.core.uploads import validate_upload
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        ok, err = validate_upload(file)
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        key = _store_upload('safety_events', file)
        return Response({'file_url': f'/media/{key}'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='attachment')
    def attachment(self, request):
        """Stream a stored safety-event attachment by its /media/ URL."""
        from apps.ground_training.views import _stream_from_storage
        url = request.query_params.get('url')
        if not url:
            return Response({'error': 'No url provided'}, status=status.HTTP_400_BAD_REQUEST)
        # Ownership scoping: the attachment must belong to an event the current
        # user reported, or to an event they are allowed to view.
        from .models import SafetyEvent
        from django.db.models import Q
        from apps.accounts.permissions import user_has_domain_permission
        if not user_has_domain_permission(request.user, 'quality', 'view'):
            attached = SafetyEvent.objects.filter(
                Q(reported_by=request.user) | Q(confidential=False)
            ).values_list('attachments', flat=True)
            if not any(
                any(isinstance(a, dict) and (a.get('file_url') == url or a.get('url') == url) for a in (atts or []))
                for atts in attached
            ):
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        name = url.rsplit('/', 1)[-1]
        content_type = {
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
        }.get(name.lower().rsplit('.', 1)[-1], 'application/octet-stream')
        response = _stream_from_storage(url, content_type=content_type, filename=name, request=request)
        if response is None:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        return response

    @action(detail=True, methods=['post'])
    def investigate(self, request, pk=None):
        event = self.get_object()
        event.status = 'investigating'
        event.save()
        # Notify the reporter that investigation has started
        try:
            if event.reported_by:
                NotificationService.notify(
                    event.reported_by,
                    'safety_event',
                    'Safety Event Under Investigation',
                    f'Safety event "{event.title}" is now under investigation.',
                    {'event_id': str(event.id)},
                )
        except Exception:
            pass
        return Response({'status': 'investigating'})

    @action(detail=True, methods=['post'])
    def analyze(self, request, pk=None):
        event = self.get_object()
        event.analysis = request.data.get('analysis', event.analysis)
        event.status = 'analyzed'
        event.save()
        return Response({'status': 'analyzed'})

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        event = self.get_object()
        event.status = 'resolved'
        event.closed_at = timezone.now()
        event.save()
        return Response({'status': 'resolved'})


class QualityDocumentViewSet(viewsets.ModelViewSet):
    queryset = QualityDocument.objects.all()
    serializer_class = QualityDocumentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'
    filterset_fields = ['type', 'status']

    def perform_update(self, serializer):
        doc = serializer.save()
        try:
            if doc.status == 'approved':
                # Notify author + quality roles
                NotificationService.notify(
                    doc.author,
                    'quality_doc_approved',
                    'Quality Document Approved',
                    f'Your document "{doc.title or doc.number}" has been approved.',
                    {'doc_id': str(doc.id), 'number': doc.number},
                )
                NotificationService.notify_roles(
                    ['quality_manager', 'compliance_monitoring_manager'],
                    'quality_doc_approved',
                    'Quality Document Approved',
                    f'Quality document "{doc.title or doc.number}" has been approved.',
                    {'doc_id': str(doc.id), 'number': doc.number},
                )
        except Exception:
            pass

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        from django.core.files.storage import default_storage
        from django.http import StreamingHttpResponse
        doc = self.get_object()
        if not doc.file_url:
            return Response({'error': 'No file attached'}, status=404)
        try:
            url = doc.file_url
            if url.startswith('http://') or url.startswith('https://'):
                return Response({'file_url': doc.file_url}, status=200)
            key = url.lstrip('/')
            if key.startswith('media/'):
                key = key[len('media/'):]
            f = default_storage.open(key, 'rb')
            filename = doc.title or doc.number or 'quality-document'
            response = StreamingHttpResponse(f, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{filename}.pdf"'
            return response
        except Exception:
            return Response({'error': 'File not found'}, status=404)

    @action(detail=False, methods=['post'])
    def upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)
        from django.core.files.storage import default_storage
        path = default_storage.save(f'quality/{file.name}', file)
        return Response({'file_url': f'/media/{path}'}, status=status.HTTP_201_CREATED)


class QualityDashboardView(APIView):
    """Aggregated quality & safety KPIs for the dashboard."""

    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'

    def get(self, request):
        from django.db.models import Count, Q
        from datetime import timedelta
        from datetime import datetime

        now = timezone.now()
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # ── Date-range filtering ──
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        try:
            dt_from = datetime.strptime(date_from, '%Y-%m-%d').replace(tzinfo=now.tzinfo) if date_from else None
        except Exception:
            dt_from = None
        try:
            dt_to = datetime.strptime(date_to, '%Y-%m-%d').replace(tzinfo=now.tzinfo) if date_to else None
        except Exception:
            dt_to = None

        def date_filter(qs, field='created_at'):
            if dt_from:
                qs = qs.filter(**{f'{field}__gte': dt_from})
            if dt_to:
                qs = qs.filter(**{f'{field}__lte': dt_to + timedelta(days=1)})
            return qs

        # ── Baseline KPIs (always computed) ──
        total_audits = date_filter(Audit.objects.all()).count()
        completed_audits = date_filter(Audit.objects.filter(status='completed')).count()
        audit_completion_rate = (
            round((completed_audits / total_audits) * 100, 1)
            if total_audits > 0 else 0.0
        )

        open_ncr_count = date_filter(NonConformity.objects.filter(status='open')).count()

        overdue_capa_count = date_filter(CAPA.objects.filter(
            status__in=['open', 'in_progress'],
            due_date__lt=now,
        )).count()

        safety_events_this_month = SafetyEvent.objects.filter(
            created_at__gte=first_of_month,
        ).count()

        risk_distribution = {
            'low': date_filter(RiskAssessment.objects.filter(risk_level__lte=3)).count(),
            'medium': date_filter(RiskAssessment.objects.filter(risk_level__gte=4, risk_level__lte=6)).count(),
            'high': date_filter(RiskAssessment.objects.filter(risk_level__gte=7, risk_level__lte=12)).count(),
            'critical': date_filter(RiskAssessment.objects.filter(risk_level__gte=13)).count(),
        }

        upcoming_deadlines = DeadlineMonitorService.get_upcoming_deadlines(days_ahead=30)

        # ── Safety Events by Month (last 12 or custom range) ──
        safety_qs = date_filter(SafetyEvent.objects.all())
        safety_by_month = []
        if dt_from or dt_to:
            if dt_from:
                month_from = dt_from.replace(day=1)
            else:
                earliest = SafetyEvent.objects.order_by('created_at').values_list('created_at', flat=True).first()
                month_from = earliest.replace(day=1) if earliest else now.replace(day=1)
            month_to = dt_to.replace(day=1) if dt_to else now.replace(day=1)
            cur = month_from
            while cur <= month_to:
                cnt = safety_qs.filter(created_at__year=cur.year, created_at__month=cur.month).count()
                safety_by_month.append({'year': cur.year, 'month': cur.month, 'count': cnt})
                if cur.month == 12:
                    cur = cur.replace(year=cur.year + 1, month=1)
                else:
                    cur = cur.replace(month=cur.month + 1)
        else:
            for i in range(11, -1, -1):
                d = (now.replace(day=1) - timedelta(days=30 * i))
                cnt = SafetyEvent.objects.filter(
                    created_at__year=d.year, created_at__month=d.month
                ).count()
                safety_by_month.append({'year': d.year, 'month': d.month, 'count': cnt})

        # ── Safety Events by Type (within date range) ──
        safety_by_type = list(
            safety_qs.values('type').annotate(count=Count('id')).order_by('-count')
        )

        # ── Safety Events by Status (funnel) ──
        safety_by_status = list(
            safety_qs.values('status').annotate(count=Count('id')).order_by('status')
        )

        # ─── Audit compliance stats ──
        audit_qs = date_filter(Audit.objects.all())
        audits_by_type = list(
            audit_qs.values('type').annotate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='completed')),
            ).order_by('type')
        )
        overdue_audits = audit_qs.filter(
            status__in=['planned', 'in_progress'],
            scheduled_date__lt=now,
        ).count()

        # ── NCR stats ──
        ncr_qs = date_filter(NonConformity.objects.all())
        ncr_severity_dist = list(
            ncr_qs.values('severity').annotate(count=Count('id')).order_by('severity')
        )

        # ── CAPA effectiveness ──
        capa_qs = date_filter(CAPA.objects.all())
        total_capas = capa_qs.count()
        closed_capas = capa_qs.filter(status='closed')
        closed_on_time = 0
        total_closure_days = 0
        for c in closed_capas:
            if c.validation_date and c.created_at:
                closure_days = (c.validation_date - c.created_at).days
                total_closure_days += closure_days
                if c.due_date and c.validation_date <= c.due_date:
                    closed_on_time += 1
            else:
                total_closure_days += 0
        capa_effectiveness_rate = round(
            (closed_on_time / closed_capas.count() * 100) if closed_capas.count() > 0 else 0, 1
        )
        avg_closure_days = round(
            total_closure_days / closed_capas.count(), 1
        ) if closed_capas.count() > 0 else 0

        return Response({
            'audit_completion_rate': audit_completion_rate,
            'open_ncr_count': open_ncr_count,
            'overdue_capa_count': overdue_capa_count,
            'safety_events_this_month': safety_events_this_month,
            'risk_distribution': risk_distribution,
            'upcoming_deadlines': upcoming_deadlines,
            'safety_by_month': safety_by_month,
            'safety_by_type': safety_by_type,
            'safety_by_status': safety_by_status,
            'audits_by_type': audits_by_type,
            'overdue_audits': overdue_audits,
            'ncr_severity_dist': ncr_severity_dist,
            'capa_effectiveness_rate': capa_effectiveness_rate,
            'avg_closure_days': avg_closure_days,
            'closed_capa_count': closed_capas.count(),
            'total_capa_count': total_capas,
        })
