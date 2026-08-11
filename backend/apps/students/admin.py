from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Student, MedicalCertificate, GroundInstructor, FlightInstructor, AdminProfile, Promotion


class TrainingAdminMixin:
    def is_training_admin(self, request):
        return request.user.role == 'training_admin'

    def has_view_permission(self, request, obj=None):
        if self.is_training_admin(request):
            return True
        return super().has_view_permission(request, obj)

    def has_change_permission(self, request, obj=None):
        if self.is_training_admin(request):
            return True
        return super().has_change_permission(request, obj)

    def has_add_permission(self, request):
        if self.is_training_admin(request):
            return True
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        if self.is_training_admin(request):
            return True
        return super().has_delete_permission(request, obj)


@admin.register(Promotion)
class PromotionAdmin(TrainingAdminMixin, ModelAdmin):
    list_display = ['code', 'name', 'program', 'status', 'start_date', 'end_date', 'student_count']
    list_filter = ['program', 'status']
    search_fields = ['code', 'name']
    autocomplete_fields = ['main_instructor']
    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'program', 'status'),
        }),
        ('Dates', {
            'fields': ('start_date', 'end_date'),
        }),
        ('Assignment', {
            'fields': ('main_instructor',),
        }),
    )


@admin.register(Student)
class StudentAdmin(TrainingAdminMixin, ModelAdmin):
    list_display = ['student_number', 'first_name', 'last_name', 'program', 'promotion', 'status', 'enrollment_date']
    list_filter = ['program', 'status', 'promotion']
    search_fields = ['first_name', 'last_name', 'student_number']
    ordering = ['last_name', 'first_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    autocomplete_fields = ['user', 'main_instructor', 'promotion']
    fieldsets = (
        ('Personal Info', {
            'fields': ('user', 'first_name', 'last_name', 'date_of_birth', 'nationality'),
        }),
        ('Contact', {
            'fields': ('phone', 'address'),
        }),
        ('Academic', {
            'fields': ('student_number', 'program', 'promotion', 'enrollment_date', 'status'),
        }),
        ('Assignment', {
            'fields': ('main_instructor',),
        }),
    )


@admin.register(MedicalCertificate)
class MedicalCertificateAdmin(ModelAdmin):
    list_display = ['student', 'issue_date', 'expiry_date', 'status']
    list_filter = ['status']
    search_fields = ['student__first_name', 'student__last_name']
    autocomplete_fields = ['student']


@admin.register(GroundInstructor)
class GroundInstructorAdmin(TrainingAdminMixin, ModelAdmin):
    list_display = ['first_name', 'last_name', 'status', 'hire_date']
    list_filter = ['status']
    search_fields = ['first_name', 'last_name']
    autocomplete_fields = ['user']
    fieldsets = (
        (None, {
            'fields': ('user', 'first_name', 'last_name', 'status'),
        }),
        ('Qualifications', {
            'fields': ('qualifications', 'authorized_subjects'),
        }),
        ('Dates', {
            'fields': ('hire_date', 'medical_expiry'),
        }),
    )


@admin.register(FlightInstructor)
class FlightInstructorAdmin(TrainingAdminMixin, ModelAdmin):
    list_display = ['first_name', 'last_name', 'license_number', 'total_flight_hours', 'instruction_hours', 'status']
    list_filter = ['status']
    search_fields = ['first_name', 'last_name', 'license_number']
    autocomplete_fields = ['user']
    fieldsets = (
        (None, {
            'fields': ('user', 'first_name', 'last_name', 'license_number', 'status'),
        }),
        ('Qualifications', {
            'fields': ('qualifications', 'authorized_aircraft_types'),
        }),
        ('Hours', {
            'fields': ('total_flight_hours', 'instruction_hours'),
        }),
        ('Dates', {
            'fields': ('hire_date', 'medical_expiry', 'license_expiry'),
        }),
    )


@admin.register(AdminProfile)
class AdminProfileAdmin(ModelAdmin):
    list_display = ['user', 'department']
    search_fields = ['user__email', 'department']
    autocomplete_fields = ['user']
