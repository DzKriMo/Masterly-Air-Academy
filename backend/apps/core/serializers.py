from rest_framework import serializers
from django.apps import apps
from .models import SystemSetting, AuditLog


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ['id', 'key', 'value', 'description', 'category', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    entity_name = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_email', 'action', 'entity', 'entity_id',
                  'entity_name', 'summary',
                  'old_values', 'new_values', 'ip_address', 'user_agent', 'created_at']

    def get_entity_name(self, obj):
        """Try to resolve entity+entity_id to a human-readable name."""
        if not obj.entity_id:
            return None
        mapping = {
            'Invoice': ('administration', 'Invoice', 'invoice_number'),
            'Payment': ('administration', 'Payment', 'id'),
            'Contract': ('administration', 'Contract', 'contract_number'),
            'Student': ('students', 'Student', 'full_name'),
            'User': ('accounts', None, 'email'),
            'Message': ('notifications', 'Message', 'subject'),
            'Document': ('administration', 'Document', 'name'),
            'Exam': ('exams', 'Exam', 'title'),
            'Certificate': ('exams', 'Certificate', 'certificate_number'),
            'Course': ('ground_training', 'Course', 'title'),
            'Subject': ('ground_training', 'Subject', 'code'),
            'Aircraft': ('flight_training', 'Aircraft', 'registration'),
            'FlightLesson': ('flight_training', 'FlightLesson', 'id'),
            'Room': ('ground_training', 'Room', 'name'),
            'Simulator': ('flight_training', 'Simulator', 'name'),
            'Application': ('administration', 'Application', 'application_number'),
            'AcademicYear': ('core', 'AcademicYear', 'name'),
            'SystemSetting': ('core', 'SystemSetting', 'key'),
        }
        if obj.entity in mapping:
            app_label, model_name, field = mapping[obj.entity]
            try:
                if model_name is None:
                    # Direct User model
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    instance = User.objects.filter(id=obj.entity_id).first()
                else:
                    Model = apps.get_model(app_label, model_name)
                    instance = Model.objects.filter(id=obj.entity_id).first()
                if instance:
                    if field == 'full_name':
                        return str(instance.full_name)
                    return str(getattr(instance, field, str(instance)))
            except Exception:
                pass
        return str(obj.entity_id)[:8] + '...'

    def get_summary(self, obj):
        """Generate a human-readable one-line summary."""
        user = obj.user.email if obj.user else 'System'
        action = obj.get_action_display() if hasattr(obj, 'get_action_display') else obj.action
        entity_label = obj.entity
        name = self.get_entity_name(obj)
        if name:
            entity_label = f'{obj.entity} "{name}"'
        return f'{user} {action.lower()} {entity_label}'
