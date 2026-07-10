from django.contrib import admin
from .models import Student, MedicalCertificate, GroundInstructor, FlightInstructor, AdminProfile


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['student_number', 'first_name', 'last_name', 'program', 'status', 'enrollment_date']
    list_filter = ['program', 'status', 'academic_year']
    search_fields = ['first_name', 'last_name', 'student_number']
    ordering = ['last_name', 'first_name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(MedicalCertificate)
class MedicalCertificateAdmin(admin.ModelAdmin):
    list_display = ['student', 'issue_date', 'expiry_date', 'status']
    list_filter = ['status']
    search_fields = ['student__first_name', 'student__last_name']


@admin.register(GroundInstructor)
class GroundInstructorAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'status', 'hire_date']
    list_filter = ['status']
    search_fields = ['first_name', 'last_name']


@admin.register(FlightInstructor)
class FlightInstructorAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'license_number', 'total_flight_hours', 'instruction_hours', 'status']
    list_filter = ['status']
    search_fields = ['first_name', 'last_name', 'license_number']


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'department']
    search_fields = ['user__email']
