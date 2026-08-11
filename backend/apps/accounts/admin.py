from django.contrib import admin
from unfold.admin import ModelAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'role', 'status', 'is_active', 'last_login_at']
    list_filter = ['role', 'status', 'is_active', 'groups']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    readonly_fields = ['id', 'last_login_at', 'last_login_ip', 'date_joined', 'last_login']

    fieldsets = (
        (None, {'fields': ('id', 'email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'username')}),
        (_('Role & Status'), {'fields': ('role', 'status', 'is_active')}),
        (_('Groups & Permissions'), {
            'fields': ('groups', 'user_permissions'),
            'classes': ('collapse',),
        }),
        (_('Login info'), {'fields': ('last_login_at', 'last_login_ip', 'date_joined', 'last_login')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'role', 'status'),
        }),
    )

    # ---------- training_admin ----------
    TRAINEE_ROLES = {
        'student', 'candidate', 'graduate',
        'flight_instructor', 'chief_flight_instructor',
        'ground_instructor', 'chief_ground_instructor',
    }

    def is_training_admin(self, request):
        return request.user.role == 'training_admin'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if self.is_training_admin(request):
            qs = qs.filter(role__in=self.TRAINEE_ROLES)
        return qs

    def has_view_permission(self, request, obj=None):
        if self.is_training_admin(request):
            if obj is not None and obj.role not in self.TRAINEE_ROLES:
                return False
            return True
        return super().has_view_permission(request, obj)

    def has_change_permission(self, request, obj=None):
        if self.is_training_admin(request):
            if obj is not None and obj.role not in self.TRAINEE_ROLES:
                return False
            return True
        return super().has_change_permission(request, obj)

    def has_add_permission(self, request):
        if self.is_training_admin(request):
            return True
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        if self.is_training_admin(request):
            return False
        return super().has_delete_permission(request, obj)

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if self.is_training_admin(request):
            return tuple(
                (title, opts)
                for title, opts in fieldsets
                if title != _('Groups & Permissions')
            )
        return fieldsets

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        field = super().formfield_for_choice_field(db_field, request, **kwargs)
        if db_field.name == 'role' and self.is_training_admin(request):
            field.choices = [
                c for c in field.choices
                if not c[0] or c[0] in self.TRAINEE_ROLES
            ]
        return field

    def save_model(self, request, obj, form, change):
        if self.is_training_admin(request):
            obj.is_staff = False
        super().save_model(request, obj, form, change)
