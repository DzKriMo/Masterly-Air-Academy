from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import (
    QuestionBank, Quiz, QuizAttempt, Exam, ExamAttempt,
    PracticalEvaluation, StudentCompetency, ProgressCheck,
    SkillTest, Certificate,
)


@admin.register(QuestionBank)
class QuestionBankAdmin(ModelAdmin):
    list_display = ['question_text_preview', 'question_type', 'subject', 'difficulty']
    list_filter = ['question_type', 'difficulty', 'subject']
    search_fields = ['question_text']

    def question_text_preview(self, obj):
        return obj.question_text[:100]
    question_text_preview.short_description = 'Question'


@admin.register(Quiz)
class QuizAdmin(ModelAdmin):
    list_display = ['title', 'module', 'duration', 'passing_grade', 'is_open']


@admin.register(QuizAttempt)
class QuizAttemptAdmin(ModelAdmin):
    list_display = ['student', 'quiz', 'score', 'started_at']


@admin.register(Exam)
class ExamAdmin(ModelAdmin):
    list_display = ['code', 'title', 'program', 'type', 'duration', 'passing_grade', 'status']
    list_filter = ['program', 'type', 'status']


@admin.register(ExamAttempt)
class ExamAttemptAdmin(ModelAdmin):
    list_display = ['student', 'exam', 'attempt', 'score', 'is_passed', 'completed_at']
    list_filter = ['is_passed']


@admin.register(PracticalEvaluation)
class PracticalEvaluationAdmin(ModelAdmin):
    list_display = ['student', 'instructor', 'date', 'grade', 'decision']


@admin.register(StudentCompetency)
class StudentCompetencyAdmin(ModelAdmin):
    list_display = ['student', 'competency', 'program', 'status']
    list_filter = ['program', 'status']


@admin.register(ProgressCheck)
class ProgressCheckAdmin(ModelAdmin):
    list_display = ['student', 'examiner', 'scheduled_date', 'result', 'status']


@admin.register(SkillTest)
class SkillTestAdmin(ModelAdmin):
    list_display = ['student', 'examiner', 'scheduled_date', 'result', 'status']


@admin.register(Certificate)
class CertificateAdmin(ModelAdmin):
    list_display = ['certificate_number', 'student', 'type', 'issue_date', 'status']
    list_filter = ['type', 'status']
