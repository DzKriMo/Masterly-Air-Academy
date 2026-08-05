import uuid
import secrets
from django.db import models
from django.conf import settings
from apps.ground_training.models import Subject, Module
from apps.students.models import Student, Promotion, TrainingProgram


class QuestionDifficulty(models.TextChoices):
    EASY = 'easy', 'Easy'
    MEDIUM = 'medium', 'Medium'
    HARD = 'hard', 'Hard'


class FinalQuestionType(models.TextChoices):
    MCQ = 'mcq', 'Multiple Choice'
    SCQ = 'scq', 'Single Choice'
    ESSAY = 'essay', 'Essay'
    TRUE_FALSE = 'true_false', 'True/False'


class FinalExamQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='final_questions')
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='final_questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=FinalQuestionType.choices, default=FinalQuestionType.MCQ)
    difficulty = models.CharField(max_length=10, choices=QuestionDifficulty.choices, default=QuestionDifficulty.MEDIUM)
    options = models.JSONField(default=list, blank=True)
    correct_answer = models.TextField(blank=True, null=True)
    explanation = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'final_exam_questions'
        verbose_name = 'Final Exam Question'
        verbose_name_plural = 'Final Exam Questions'
        ordering = ['subject', 'module', 'difficulty']
        indexes = [
            models.Index(fields=['subject', 'module']),
            models.Index(fields=['difficulty']),
            models.Index(fields=['question_type']),
        ]

    def __str__(self):
        return f'[{self.difficulty}] {self.question_text[:60]}'


class FinalExamStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    GENERATED = 'generated', 'Generated'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'


def generate_exam_hash():
    return secrets.token_urlsafe(8)


def generate_access_code():
    return secrets.token_hex(4).upper()


class FinalExam(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hash = models.CharField(max_length=32, unique=True, default=generate_exam_hash)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='final_exams')
    title = models.CharField(max_length=255)
    title_ar = models.CharField(max_length=255, blank=True, null=True)
    title_fr = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_final_exams')
    promotions = models.ManyToManyField(Promotion, blank=True, related_name='final_exams')
    status = models.CharField(max_length=20, choices=FinalExamStatus.choices, default=FinalExamStatus.DRAFT)
    duration_minutes = models.IntegerField(default=120)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'final_exams'
        verbose_name = 'Final Exam'
        verbose_name_plural = 'Final Exams'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.subject.code if hasattr(self.subject, "code") else self.subject.title_en})'


class FinalExamModuleConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(FinalExam, on_delete=models.CASCADE, related_name='module_configs')
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='final_exam_configs')
    question_count = models.IntegerField(default=10)
    difficulty_distribution = models.JSONField(default=dict)
    type_distribution = models.JSONField(default=dict)

    class Meta:
        db_table = 'final_exam_module_configs'
        unique_together = ['exam', 'module']

    def __str__(self):
        return f'{self.exam.title} — {self.module.title}: {self.question_count} questions'


class FinalExamAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(FinalExam, on_delete=models.CASCADE, related_name='assignments')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='final_exam_assignments')
    access_code = models.CharField(max_length=16, unique=True, default=generate_access_code)
    questions = models.JSONField(default=list)
    answers = models.JSONField(default=dict, blank=True)
    violations = models.JSONField(default=list, blank=True)
    is_flagged = models.BooleanField(default=False)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'final_exam_assignments'
        unique_together = ['exam', 'student']
        ordering = ['student__last_name', 'student__first_name']

    def __str__(self):
        return f'{self.student.full_name} — {self.exam.title} ({self.status})'
