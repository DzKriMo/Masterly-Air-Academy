from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import (
    QuestionBank, Quiz, QuizAttempt, Exam, ExamAttempt,
    PracticalEvaluation, StudentCompetency, ProgressCheck,
    SkillTest, Certificate,
)


# ── Question Bank ──────────────────────────────────────────

@admin.register(QuestionBank)
class QuestionBankAdmin(ModelAdmin):
    list_display = ['question_text_preview', 'question_type', 'subject', 'difficulty']
    list_filter = ['question_type', 'difficulty', 'subject']
    search_fields = ['question_text', 'correct_answer']
    autocomplete_fields = ['subject']
    fieldsets = (
        (None, {
            'fields': ('subject', 'question_type', 'difficulty'),
        }),
        ('Question', {
            'fields': ('question_text', 'options', 'correct_answer'),
        }),
        ('Details', {
            'fields': ('explanation', 'reference'),
        }),
    )

    def question_text_preview(self, obj):
        return obj.question_text[:100]
    question_text_preview.short_description = 'Question'


# ── Quiz ───────────────────────────────────────────────────

@admin.register(Quiz)
class QuizAdmin(ModelAdmin):
    list_display = ['title', 'module', 'duration', 'passing_grade', 'max_attempts', 'is_open']
    list_filter = ['is_open']
    search_fields = ['title']
    autocomplete_fields = ['module']
    fieldsets = (
        (None, {
            'fields': ('module', 'title', 'description'),
        }),
        ('Settings', {
            'fields': ('duration', 'passing_grade', 'max_attempts'),
        }),
        ('Availability', {
            'fields': ('is_open', 'open_date', 'close_date'),
        }),
    )


@admin.register(QuizAttempt)
class QuizAttemptAdmin(ModelAdmin):
    list_display = ['student', 'quiz', 'score', 'started_at', 'completed_at']
    readonly_fields = ['started_at']
    autocomplete_fields = ['student', 'quiz']


# ── Exams ─────────────────────────────────────────────────

@admin.register(Exam)
class ExamAdmin(ModelAdmin):
    list_display = ['code', 'title', 'program', 'type', 'duration', 'passing_grade', 'max_attempts', 'status']
    list_filter = ['program', 'type', 'status']
    search_fields = ['code', 'title', 'title_fr', 'title_ar']
    autocomplete_fields = ['subject']
    fieldsets = (
        (None, {
            'fields': ('code', 'title', 'title_fr', 'title_ar', 'program', 'type', 'status'),
        }),
        ('Settings', {
            'fields': ('subject', 'duration', 'question_count', 'passing_grade', 'max_attempts'),
        }),
        ('Schedule', {
            'fields': ('open_date', 'close_date'),
        }),
    )


@admin.register(ExamAttempt)
class ExamAttemptAdmin(ModelAdmin):
    list_display = ['student', 'exam', 'attempt', 'score', 'is_passed', 'completed_at']
    list_filter = ['is_passed']
    readonly_fields = ['started_at']
    autocomplete_fields = ['student', 'exam']


# ── Practical Evaluations ──────────────────────────────────

@admin.register(PracticalEvaluation)
class PracticalEvaluationAdmin(ModelAdmin):
    list_display = ['student', 'instructor', 'date', 'grade', 'result', 'decision']
    list_filter = ['result', 'decision']
    search_fields = ['student__first_name', 'student__last_name']
    autocomplete_fields = ['student', 'instructor']


# ── Competencies ───────────────────────────────────────────

@admin.register(StudentCompetency)
class StudentCompetencyAdmin(ModelAdmin):
    list_display = ['student', 'competency', 'program', 'status']
    list_filter = ['program', 'status']
    search_fields = ['student__first_name', 'student__last_name', 'competency']
    autocomplete_fields = ['student']


# ── Progress Checks ───────────────────────────────────────

@admin.register(ProgressCheck)
class ProgressCheckAdmin(ModelAdmin):
    list_display = ['student', 'examiner', 'scheduled_date', 'result', 'status']
    list_filter = ['status', 'result']
    search_fields = ['student__first_name', 'student__last_name']
    autocomplete_fields = ['student', 'examiner']
    date_hierarchy = 'scheduled_date'


# ── Skill Tests ────────────────────────────────────────────

@admin.register(SkillTest)
class SkillTestAdmin(ModelAdmin):
    list_display = ['student', 'examiner', 'scheduled_date', 'result', 'status']
    list_filter = ['status', 'result']
    search_fields = ['student__first_name', 'student__last_name']
    autocomplete_fields = ['student', 'examiner', 'authorized_by']
    date_hierarchy = 'scheduled_date'


# ── Certificates ───────────────────────────────────────────

@admin.register(Certificate)
class CertificateAdmin(ModelAdmin):
    list_display = ['certificate_number', 'student', 'type', 'program', 'issue_date', 'status']
    list_filter = ['type', 'program', 'status']
    search_fields = ['certificate_number', 'student__first_name', 'student__last_name', 'title']
    autocomplete_fields = ['student', 'signed_by']
    date_hierarchy = 'issue_date'
    readonly_fields = ['id', 'created_at']
