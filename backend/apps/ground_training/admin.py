from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Subject, Module, ModuleLesson, ModuleDocument, Room, Course, CourseEnrollment, AttendanceRecord


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 0


class ModuleLessonInline(admin.TabularInline):
    model = ModuleLesson
    extra = 0


@admin.register(Subject)
class SubjectAdmin(ModelAdmin):
    list_display = ['code', 'title_en', 'program', 'total_hours', 'status']
    list_filter = ['program', 'status', 'academic_year']
    search_fields = ['code', 'title_en', 'title_fr']
    inlines = [ModuleInline]


@admin.register(Module)
class ModuleAdmin(ModelAdmin):
    list_display = ['subject', 'title', 'order', 'duration', 'status']
    list_filter = ['subject', 'status']
    search_fields = ['title']
    inlines = [ModuleLessonInline]


@admin.register(ModuleLesson)
class ModuleLessonAdmin(ModelAdmin):
    list_display = ['module', 'lesson_no', 'title']


@admin.register(ModuleDocument)
class ModuleDocumentAdmin(ModelAdmin):
    list_display = ['module', 'name', 'type']


@admin.register(Room)
class RoomAdmin(ModelAdmin):
    list_display = ['name', 'capacity', 'location', 'status']
    list_filter = ['status']
    search_fields = ['name', 'location']


@admin.register(Course)
class CourseAdmin(ModelAdmin):
    list_display = ['title', 'subject', 'instructor', 'scheduled_date', 'start_time', 'room', 'status']
    list_filter = ['status', 'academic_year']
    search_fields = ['title', 'subject__title_en']
    date_hierarchy = 'scheduled_date'


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(ModelAdmin):
    list_display = ['student', 'course', 'status', 'enrolled_at']


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(ModelAdmin):
    list_display = ['student', 'course', 'date', 'status']
    list_filter = ['status', 'date']
