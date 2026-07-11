from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import (
    FlightProgram, FlightLessonTemplate, Aircraft,
    FlightLesson, FlightPreparation, InstructorAvailability,
    ResourceBooking, MaintenanceRecord,
)


@admin.register(FlightProgram)
class FlightProgramAdmin(ModelAdmin):
    list_display = ['code', 'title', 'program', 'status']
    list_filter = ['program', 'status']


@admin.register(FlightLessonTemplate)
class FlightLessonTemplateAdmin(ModelAdmin):
    list_display = ['program', 'lesson_number', 'title', 'planned_duration']
    list_filter = ['program']


@admin.register(Aircraft)
class AircraftAdmin(ModelAdmin):
    list_display = ['registration', 'manufacturer', 'model', 'status', 'airframe_hours', 'next_maintenance']
    list_filter = ['status']
    search_fields = ['registration', 'manufacturer', 'model']


@admin.register(FlightLesson)
class FlightLessonAdmin(ModelAdmin):
    list_display = ['student', 'instructor', 'aircraft', 'scheduled_date', 'status', 'flight_duration', 'grade']
    list_filter = ['status', 'scheduled_date']
    search_fields = ['student__first_name', 'student__last_name', 'instructor__last_name']
    date_hierarchy = 'scheduled_date'


@admin.register(FlightPreparation)
class FlightPreparationAdmin(ModelAdmin):
    list_display = ['flight_lesson', 'weather_check', 'notam_check', 'prepared_at']


@admin.register(InstructorAvailability)
class InstructorAvailabilityAdmin(ModelAdmin):
    list_display = ['instructor', 'day_of_week', 'start_time', 'end_time', 'is_available']


@admin.register(ResourceBooking)
class ResourceBookingAdmin(ModelAdmin):
    list_display = ['resource_type', 'resource_id_preview', 'start_time', 'end_time', 'status']
    list_filter = ['resource_type', 'status']

    def resource_id_preview(self, obj):
        return str(obj.resource_id)[:8] + '...'
    resource_id_preview.short_description = 'Resource ID'


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(ModelAdmin):
    list_display = ['aircraft', 'type', 'start_date', 'end_date', 'status']
    list_filter = ['type', 'status']
