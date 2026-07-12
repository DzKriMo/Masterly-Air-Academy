from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.permissions import HasRolePermission
from .models import Audit, NonConformity, CAPA, RiskAssessment, SafetyEvent, QualityDocument
from .serializers import AuditSerializer, NonConformitySerializer, CAPASerializer, RiskAssessmentSerializer, SafetyEventSerializer, QualityDocumentSerializer


class AuditViewSet(viewsets.ModelViewSet):
    queryset = Audit.objects.select_related('lead_auditor').prefetch_related('non_conformities').all()
    serializer_class = AuditSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'
    filterset_fields = ['type', 'status']

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        audit = self.get_object()
        audit.status = 'completed'
        audit.completed_date = __import__('django.utils.timezone').utils.timezone.now()
        audit.findings = request.data.get('findings', audit.findings)
        audit.save()
        return Response(AuditSerializer(audit).data)


class NonConformityViewSet(viewsets.ModelViewSet):
    queryset = NonConformity.objects.select_related('audit', 'responsible').prefetch_related('capas').all()
    serializer_class = NonConformitySerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'
    filterset_fields = ['audit', 'severity', 'status']

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        ncr = self.get_object()
        ncr.status = 'closed'
        ncr.root_cause = request.data.get('root_cause', ncr.root_cause)
        ncr.closing_notes = request.data.get('closing_notes', ncr.closing_notes)
        ncr.closed_at = __import__('django.utils.timezone').utils.timezone.now()
        ncr.save()
        return Response(NonConformitySerializer(ncr).data)


class CAPAViewSet(viewsets.ModelViewSet):
    queryset = CAPA.objects.select_related('non_conformity', 'responsible').all()
    serializer_class = CAPASerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'
    filterset_fields = ['type', 'status']

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        capa = self.get_object()
        capa.status = 'closed'
        capa.closing_notes = request.data.get('closing_notes', '')
        capa.validation_date = __import__('django.utils.timezone').utils.timezone.now()
        capa.save()
        return Response(CAPASerializer(capa).data)


class RiskAssessmentViewSet(viewsets.ModelViewSet):
    queryset = RiskAssessment.objects.all()
    serializer_class = RiskAssessmentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'safety.view'
    filterset_fields = ['status']
    ordering_fields = ['risk_level']


class SafetyEventViewSet(viewsets.ModelViewSet):
    queryset = SafetyEvent.objects.select_related('reported_by').all()
    serializer_class = SafetyEventSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type', 'status']

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)


class QualityDocumentViewSet(viewsets.ModelViewSet):
    queryset = QualityDocument.objects.all()
    serializer_class = QualityDocumentSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'quality.view'
    filterset_fields = ['type', 'status']
