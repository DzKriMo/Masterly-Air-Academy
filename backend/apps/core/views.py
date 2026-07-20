from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import HasRolePermission
from .models import SystemSetting, AuditLog
from .serializers import SystemSettingSerializer, AuditLogSerializer


class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'accounts.manage'


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all().order_by('-created_at')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'audit_logs.view'
    search_fields = ['action', 'entity', 'user__email']
    filterset_fields = ['action', 'entity']
