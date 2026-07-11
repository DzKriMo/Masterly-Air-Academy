from rest_framework import serializers
from .models import Audit, NonConformity, CAPA, RiskAssessment, SafetyEvent, QualityDocument


class AuditSerializer(serializers.ModelSerializer):
    lead_auditor_name = serializers.SerializerMethodField()
    ncr_count = serializers.SerializerMethodField()

    class Meta:
        model = Audit
        fields = ['id', 'title', 'type', 'scope', 'scheduled_date', 'completed_date', 'status', 'lead_auditor', 'lead_auditor_name', 'findings', 'ncr_count', 'created_at']

    def get_lead_auditor_name(self, obj):
        return obj.lead_auditor.email if obj.lead_auditor else None

    def get_ncr_count(self, obj):
        return obj.non_conformities.count()


class NonConformitySerializer(serializers.ModelSerializer):
    audit_title = serializers.CharField(source='audit.title', read_only=True)
    responsible_name = serializers.SerializerMethodField()
    capa_count = serializers.SerializerMethodField()

    class Meta:
        model = NonConformity
        fields = ['id', 'audit', 'audit_title', 'title', 'description', 'severity', 'responsible', 'responsible_name', 'due_date', 'status', 'root_cause', 'closing_notes', 'capa_count', 'created_at']

    def get_responsible_name(self, obj):
        return obj.responsible.email if obj.responsible else None

    def get_capa_count(self, obj):
        return obj.capas.count()


class CAPASerializer(serializers.ModelSerializer):
    ncr_title = serializers.CharField(source='non_conformity.title', read_only=True)

    class Meta:
        model = CAPA
        fields = ['id', 'non_conformity', 'ncr_title', 'type', 'title', 'description', 'responsible', 'due_date', 'status', 'closing_notes', 'created_at']


class RiskAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskAssessment
        fields = ['id', 'hazard', 'description', 'probability', 'severity', 'risk_level', 'mitigation_measures', 'status', 'reeval_date']


class SafetyEventSerializer(serializers.ModelSerializer):
    reporter_name = serializers.SerializerMethodField()

    class Meta:
        model = SafetyEvent
        fields = ['id', 'title', 'type', 'description', 'reported_by', 'reporter_name', 'confidential', 'status', 'analysis', 'created_at']

    def get_reporter_name(self, obj):
        return obj.reported_by.email if obj.reported_by and not obj.confidential else 'Anonymous'
