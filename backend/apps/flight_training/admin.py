from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import (
    FlightProgram, FlightLessonTemplate, Aircraft,
    FlightLesson, FlightPreparation, InstructorAvailability,
    ResourceBooking, MaintenanceRecord,
)


class FlightPreparationInline(TabularInline):
    model = FlightPreparation
    extra = 0
    fields = ['weather_check', 'notam_check', 'performance_check', 'document_check', 'medical_check']
    readonly_fields = ['prepared_at']


class MaintenanceInline(TabularInline):
    model = MaintenanceRecord
    extra = 0
    fields = ['type', 'status', 'start_date', 'end_date']


@admin.register(FlightProgram)
class FlightProgramAdmin(ModelAdmin):
    list_display = ['code', 'title', 'program', 'status']
    list_filter = ['program', 'status']
    search_fields = ['code', 'title']
    fieldsets = (
        (None, {
            'fields': ('code', 'title', 'program', 'status'),
        }),
        ('Details', {
            'fields': ('description',),
        }),
    )


@admin.register(FlightLessonTemplate)
class FlightLessonTemplateAdmin(ModelAdmin):
    list_display = ['program', 'lesson_number', 'title', 'planned_duration']
    list_filter = ['program']
    search_fields = ['title']
    autocomplete_fields = ['program']
    fieldsets = (
        (None, {
            'fields': ('program', 'lesson_number', 'title'),
        }),
        ('Objectives', {
            'fields': ('objective', 'competencies', 'success_criteria'),
        }),
        ('Duration Planning', {
            'fields': ('planned_duration', 'briefing_time', 'flight_time', 'debriefing_time'),
        }),
    )


@admin.register(Aircraft)
class AircraftAdmin(ModelAdmin):
    list_display = ['registration', 'manufacturer', 'model', 'status', 'airframe_hours', 'next_maintenance']
    list_filter = ['status', 'manufacturer']
    search_fields = ['registration', 'manufacturer', 'model', 'serial_number']
    date_hierarchy = 'last_maintenance'
    inlines = [MaintenanceInline]
    fieldsets = (
        ('Identification', {
            'fields': ('registration', 'manufacturer', 'model', 'serial_number', 'year_of_manufacture'),
        }),
        ('Status & Hours', {
            'fields': ('status', 'base_location', 'airframe_hours', 'engine_hours', 'propeller_hours'),
        }),
        ('Maintenance', {
            'fields': ('last_maintenance', 'next_maintenance'),
        }),
        ('Documents', {
            'fields': ('insurance_expiry', 'certification_expiry'),
        }),
    )


@admin.register(FlightLesson)
class FlightLessonAdmin(ModelAdmin):
    list_display = ['student', 'instructor', 'aircraft', 'scheduled_date', 'status', 'flight_duration', 'grade']
    list_filter = ['status', 'scheduled_date']
    search_fields = ['student__first_name', 'student__last_name', 'instructor__last_name', 'aircraft__registration']
    date_hierarchy = 'scheduled_date'
    autocomplete_fields = ['student', 'instructor', 'aircraft', 'lesson_template']
    inlines = [FlightPreparationInline]
    fieldsets = (
        ('Schedule', {
            'fields': ('student', 'instructor', 'aircraft', 'lesson_template', 'scheduled_date', 'status'),
        }),
        ('Timing', {
            'fields': ('start_time', 'end_time', 'flight_duration', 'briefing_duration', 'debrief_duration'),
        }),
        ('Evaluation', {
            'fields': ('grade', 'result', 'exercises_completed', 'competencies_acquired'),
        }),
        ('Notes', {
            'fields': ('difficulties', 'observations', 'recommendations', 'pedagogical_note'),
        }),
    )


@admin.register(FlightPreparation)
class FlightPreparationAdmin(ModelAdmin):
    list_display = ['flight_lesson', 'weather_check', 'notam_check', 'performance_check', 'document_check', 'medical_check', 'prepared_at']
    autocomplete_fields = ['flight_lesson']


@admin.register(InstructorAvailability)
class InstructorAvailabilityAdmin(ModelAdmin):
    list_display = ['instructor', 'day_of_week_display', 'start_time', 'end_time', 'is_available']
    list_filter = ['is_available', 'day_of_week']
    autocomplete_fields = ['instructor']

    def day_of_week_display(self, obj):
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return days[obj.day_of_week] if 0 <= obj.day_of_week <= 6 else str(obj.day_of_week)
    day_of_week_display.short_description = 'Day'


@admin.register(ResourceBooking)
class ResourceBookingAdmin(ModelAdmin):
    list_display = ['resource_type', 'resource_id', 'start_time', 'end_time', 'status']
    list_filter = ['resource_type', 'status']
    autocomplete_fields = ['created_by']


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(ModelAdmin):
    list_display = ['aircraft', 'type', 'status', 'start_date', 'end_date']
    list_filter = ['type', 'status']
    autocomplete_fields = ['aircraft']
