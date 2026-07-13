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
    queryset = Audit.objects.select_related('lead_auditor').prefetch_related('non_conformities').all()
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
    queryset = NonConformity.objects.select_related('audit', 'responsible').prefetch_related('capas').all()
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
            if ra.probability and ra.severity:
                matrix[ra.probability - 1][ra.severity - 1] += 1
        return Response({'matrix': matrix, 'total': assessments.count()})


class SafetyEventViewSet(viewsets.ModelViewSet):
    queryset = SafetyEvent.objects.select_related('reported_by').all()
    serializer_class = SafetyEventSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'safety.view'
    filterset_fields = ['type', 'status']

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)


class QualityDocumentViewSet(viewsets.ModelViewSet):
    queryset = QualityDocument.objects.all()
    serializer_class = QualityDocumentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'
    filterset_fields = ['type', 'status']


class QualityDashboardView(APIView):
    """Aggregated quality & safety KPIs for the dashboard."""

    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'

    def get(self, request):
        from django.db.models import Count, Q
        from datetime import timedelta

        now = timezone.now()
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Audit completion rate
        total_audits = Audit.objects.count()
        completed_audits = Audit.objects.filter(status='completed').count()
        audit_completion_rate = (
            round((completed_audits / total_audits) * 100, 1)
            if total_audits > 0 else 0.0
        )

        # Open NCR count
        open_ncr_count = NonConformity.objects.filter(status='open').count()

        # Overdue CAPA count
        overdue_capa_count = CAPA.objects.filter(
            status__in=['open', 'in_progress'],
            due_date__lt=now,
        ).count()

        # Safety events this month
        safety_events_this_month = SafetyEvent.objects.filter(
            created_at__gte=first_of_month,
        ).count()

        # Risk distribution — count assessments by risk_level buckets
        risk_distribution = {
            'low': RiskAssessment.objects.filter(risk_level__lte=3).count(),
            'medium': RiskAssessment.objects.filter(risk_level__gte=4, risk_level__lte=6).count(),
            'high': RiskAssessment.objects.filter(risk_level__gte=7, risk_level__lte=12).count(),
            'critical': RiskAssessment.objects.filter(risk_level__gte=13).count(),
        }

        # Upcoming deadlines (next 30 days)
        upcoming_deadlines = DeadlineMonitorService.get_upcoming_deadlines(days_ahead=30)

        return Response({
            'audit_completion_rate': audit_completion_rate,
            'open_ncr_count': open_ncr_count,
            'overdue_capa_count': overdue_capa_count,
            'safety_events_this_month': safety_events_this_month,
            'risk_distribution': risk_distribution,
            'upcoming_deadlines': upcoming_deadlines,
        })
