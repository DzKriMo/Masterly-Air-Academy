from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import AuditLog, SystemSetting, AcademicYear


@admin.register(AuditLog)
class AuditLogAdmin(ModelAdmin):
    list_display = ['created_at', 'user', 'action', 'entity', 'entity_id', 'ip_address']
    list_filter = ['action', 'entity', 'created_at']
    search_fields = ['user__email', 'entity', 'ip_address']
    readonly_fields = [
        'id', 'user', 'action', 'entity', 'entity_id',
        'old_values', 'new_values', 'ip_address', 'user_agent', 'created_at'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SystemSetting)
class SystemSettingAdmin(ModelAdmin):
    list_display = ['key', 'updated_at']
    search_fields = ['key']


@admin.register(AcademicYear)
class AcademicYearAdmin(ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    ordering = ['-start_date']
