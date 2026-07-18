from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Subject, Module, ModuleLesson, ModuleDocument, Room, Course, CourseEnrollment, AttendanceRecord


# ── Inlines ─────────────────────────────────────────────────

class ModuleInline(TabularInline):
    model = Module
    extra = 1
    fields = ['order', 'title', 'duration', 'status']
    show_change_link = True


class ModuleLessonInline(TabularInline):
    model = ModuleLesson
    extra = 1
    fields = ['lesson_no', 'title']


class ModuleDocumentInline(TabularInline):
    model = ModuleDocument
    extra = 0
    fields = ['name', 'type', 'file_url']


class CourseEnrollmentInline(TabularInline):
    model = CourseEnrollment
    extra = 1
    fields = ['student', 'status']
    autocomplete_fields = ['student']
    raw_id_fields = ['student']


class AttendanceInline(TabularInline):
    model = AttendanceRecord
    extra = 0
    fields = ['student', 'date', 'status', 'notes']
    readonly_fields = ['recorded_at']


# ── Subject ────────────────────────────────────────────────

@admin.register(Subject)
class SubjectAdmin(ModelAdmin):
    list_display = ['code', 'title_en', 'program', 'total_hours', 'status']
    list_filter = ['program', 'status', 'academic_year']
    search_fields = ['code', 'title_en', 'title_fr', 'title_ar']
    ordering = ['code']
    inlines = [ModuleInline]
    fieldsets = (
        ('Identification', {
            'fields': ('code', 'program', 'academic_year', 'status'),
        }),
        ('English', {
            'fields': ('title_en', 'description_en'),
        }),
        ('French', {
            'fields': ('title_fr', 'description_fr'),
            'classes': ('collapse',),
        }),
        ('Arabic', {
            'fields': ('title_ar', 'description_ar'),
            'classes': ('collapse',),
        }),
        ('Details', {
            'fields': ('total_hours',),
        }),
    )


# ── Module ─────────────────────────────────────────────────

@admin.register(Module)
class ModuleAdmin(ModelAdmin):
    list_display = ['__str__', 'subject', 'order', 'duration', 'status']
    list_filter = ['subject', 'status']
    search_fields = ['title', 'title_fr', 'title_ar', 'subject__code']
    ordering = ['subject', 'order']
    inlines = [ModuleLessonInline, ModuleDocumentInline]
    autocomplete_fields = ['subject']
    fieldsets = (
        (None, {
            'fields': ('subject', 'order', 'status'),
        }),
        ('English', {
            'fields': ('title', 'description'),
        }),
        ('French', {
            'fields': ('title_fr', 'description_fr'),
            'classes': ('collapse',),
        }),
        ('Arabic', {
            'fields': ('title_ar', 'description_ar'),
            'classes': ('collapse',),
        }),
        ('Details', {
            'fields': ('duration',),
        }),
    )


# ── Module Lesson ──────────────────────────────────────────

@admin.register(ModuleLesson)
class ModuleLessonAdmin(ModelAdmin):
    list_display = ['__str__', 'module', 'lesson_no', 'title']
    list_filter = ['module__subject']
    search_fields = ['title', 'module__title']
    autocomplete_fields = ['module']


# ── Module Document ────────────────────────────────────────

@admin.register(ModuleDocument)
class ModuleDocumentAdmin(ModelAdmin):
    list_display = ['name', 'module', 'type']
    list_filter = ['type']
    search_fields = ['name', 'module__title']
    autocomplete_fields = ['module']


# ── Room ───────────────────────────────────────────────────

@admin.register(Room)
class RoomAdmin(ModelAdmin):
    list_display = ['name', 'capacity', 'location', 'status']
    list_filter = ['status']
    search_fields = ['name', 'location']


# ── Course ─────────────────────────────────────────────────

@admin.register(Course)
class CourseAdmin(ModelAdmin):
    list_display = ['title', 'subject', 'instructor', 'scheduled_date', 'start_time', 'end_time', 'room', 'status']
    list_filter = ['status', 'academic_year', 'subject']
    search_fields = ['title', 'subject__title_en', 'instructor__first_name', 'instructor__last_name']
    date_hierarchy = 'scheduled_date'
    inlines = [CourseEnrollmentInline, AttendanceInline]
    autocomplete_fields = ['subject', 'instructor', 'room', 'academic_year']
    fieldsets = (
        (None, {
            'fields': ('title', 'title_fr', 'title_ar'),
        }),
        ('Schedule', {
            'fields': ('scheduled_date', 'start_time', 'end_time'),
        }),
        ('Assignments', {
            'fields': ('subject', 'instructor', 'room', 'academic_year'),
        }),
        ('Status', {
            'fields': ('status', 'notes'),
        }),
    )


# ── Course Enrollment ─────────────────────────────────────

@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(ModelAdmin):
    list_display = ['student', 'course', 'status', 'enrolled_at']
    list_filter = ['status']
    search_fields = ['student__first_name', 'student__last_name', 'course__title']
    autocomplete_fields = ['student', 'course']


# ── Attendance ─────────────────────────────────────────────

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(ModelAdmin):
    list_display = ['student', 'course', 'date', 'status', 'recorded_at']
    list_filter = ['status', 'date']
    search_fields = ['student__first_name', 'student__last_name', 'course__title']
    autocomplete_fields = ['student', 'course']
