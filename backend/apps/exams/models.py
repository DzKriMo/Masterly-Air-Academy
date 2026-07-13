import uuid
from django.conf import settings
from django.db import models
from apps.students.models import TrainingProgram


class QuestionBank(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey('ground_training.Subject', on_delete=models.SET_NULL, null=True, blank=True)
    question_text = models.TextField()
    question_type = models.CharField(max_length=30)
    options = models.JSONField(default=list, blank=True)
    correct_answer = models.TextField()
    explanation = models.TextField(blank=True, null=True)
    reference = models.CharField(max_length=255, blank=True, null=True)
    difficulty = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'question_bank'
        verbose_name = 'Question'
        verbose_name_plural = 'Question Bank'

    def __str__(self):
        return self.question_text[:80]


class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey('ground_training.Module', on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    duration = models.IntegerField(help_text='Duration in minutes', null=True, blank=True)
    passing_grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    max_attempts = models.IntegerField(default=1)
    is_open = models.BooleanField(default=False)
    open_date = models.DateTimeField(null=True, blank=True)
    close_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quizzes'
        verbose_name = 'Quiz'
        verbose_name_plural = 'Quizzes'

    def __str__(self):
        return self.title or f'Quiz {self.id}'


class QuizAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='quiz_attempts')
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    answers = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'quiz_attempts'

    def __str__(self):
        return f'{self.student.full_name} - Quiz {self.quiz.id}'


class Exam(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    title_ar = models.CharField(max_length=255, blank=True, null=True)
    title_fr = models.CharField(max_length=255, blank=True, null=True)
    subject = models.ForeignKey('ground_training.Subject', on_delete=models.SET_NULL, null=True, blank=True)
    program = models.CharField(max_length=10, choices=TrainingProgram.choices, null=True, blank=True)
    type = models.CharField(max_length=30, blank=True, null=True)
    duration = models.IntegerField(help_text='Duration in minutes')
    question_count = models.IntegerField(null=True, blank=True)
    passing_grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    max_attempts = models.IntegerField(default=3)
    open_date = models.DateTimeField(null=True, blank=True)
    close_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'exams'
        verbose_name = 'Exam'
        verbose_name_plural = 'Exams'
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.title or "Untitled"}'


class ExamAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='exam_attempts')
    attempt = models.IntegerField()
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    answers = models.JSONField(default=dict, blank=True)
    is_passed = models.BooleanField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    graded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'exam_attempts'
        unique_together = ['exam', 'student', 'attempt']

    def __str__(self):
        return f'{self.student.full_name} - {self.exam.code} (Attempt {self.attempt})'


class PracticalEvaluation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='practical_evaluations')
    instructor = models.ForeignKey('students.FlightInstructor', on_delete=models.CASCADE, related_name='practical_evaluations')
    lesson_type = models.CharField(max_length=20, blank=True, null=True)
    lesson_id = models.UUIDField(null=True, blank=True)
    date = models.DateTimeField()
    competencies = models.JSONField(default=dict, blank=True)
    result = models.CharField(max_length=20, blank=True, null=True)
    grade = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    observations = models.TextField(blank=True, null=True)
    strengths = models.TextField(blank=True, null=True)
    improvements = models.TextField(blank=True, null=True)
    recommendations = models.TextField(blank=True, null=True)
    decision = models.CharField(max_length=30, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'practical_evaluations'

    def __str__(self):
        return f'Eval: {self.student.full_name} - {self.date.strftime("%Y-%m-%d")}'


class StudentCompetency(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='competencies')
    program = models.CharField(max_length=10, choices=TrainingProgram.choices, null=True, blank=True)
    competency = models.CharField(max_length=255)
    status = models.CharField(max_length=30, default='not_started')
    achieved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'student_competencies'
        unique_together = ['student', 'program', 'competency']
        verbose_name = 'Student Competency'
        verbose_name_plural = 'Student Competencies'

    def __str__(self):
        return f'{self.student.full_name} - {self.competency}'


class ProgressCheck(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='progress_checks')
    examiner = models.ForeignKey('students.FlightInstructor', on_delete=models.CASCADE, related_name='progress_checks')
    scheduled_date = models.DateTimeField()
    completed_date = models.DateTimeField(null=True, blank=True)
    result = models.CharField(max_length=20, blank=True, null=True)
    observations = models.TextField(blank=True, null=True)
    recommendations = models.TextField(blank=True, null=True)
    lessons_to_repeat = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'progress_checks'

    def __str__(self):
        return f'Progress Check: {self.student.full_name} - {self.scheduled_date.strftime("%Y-%m-%d")}'


class SkillTest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='skill_tests')
    examiner = models.ForeignKey('students.FlightInstructor', on_delete=models.CASCADE, related_name='skill_tests_examined')
    authorized_by = models.ForeignKey('students.FlightInstructor', on_delete=models.SET_NULL, null=True, blank=True, related_name='authorized_skill_tests')
    scheduled_date = models.DateTimeField()
    completed_date = models.DateTimeField(null=True, blank=True)
    result = models.CharField(max_length=20, blank=True, null=True)
    report_url = models.CharField(max_length=500, blank=True, null=True)
    observations = models.TextField(blank=True, null=True)
    recommendations = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, default='authorized')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'skill_tests'

    def __str__(self):
        return f'Skill Test: {self.student.full_name}'


class Certificate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='certificates')
    certificate_number = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=50, blank=True, null=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    title_ar = models.CharField(max_length=255, blank=True, null=True)
    title_fr = models.CharField(max_length=255, blank=True, null=True)
    program = models.CharField(max_length=10, choices=TrainingProgram.choices, null=True, blank=True)
    issue_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    file_url = models.CharField(max_length=500, blank=True, null=True)
    qr_code = models.CharField(max_length=500, blank=True, null=True)
    signed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, default='issued')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'certificates'
        verbose_name = 'Certificate'
        verbose_name_plural = 'Certificates'

    def __str__(self):
        return f'Certificate #{self.certificate_number} - {self.student.full_name}'
