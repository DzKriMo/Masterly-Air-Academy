from rest_framework import serializers
from .models import (
    QuestionBank, Quiz, QuizAttempt, Exam, ExamQuestion, ExamAttempt,
    PracticalEvaluation, StudentCompetency,
    ProgressCheck, SkillTest, Certificate,
)


class ProgressCheckSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    examiner_name = serializers.SerializerMethodField()

    class Meta:
        model = ProgressCheck
        fields = [
            'id', 'student', 'student_name', 'examiner', 'examiner_name',
            'scheduled_date', 'completed_date',
            'result', 'observations', 'recommendations', 'lessons_to_repeat',
            'status',
        ]

    def get_student_name(self, obj):
        return obj.student.full_name if hasattr(obj, 'student') else ''

    def get_examiner_name(self, obj):
        return f'{obj.examiner.first_name} {obj.examiner.last_name}' if hasattr(obj, 'examiner') else ''


class SkillTestSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    examiner_name = serializers.SerializerMethodField()
    authorized_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SkillTest
        fields = [
            'id', 'student', 'student_name', 'examiner', 'examiner_name',
            'authorized_by', 'authorized_by_name', 'scheduled_date',
            'completed_date', 'result', 'report_url', 'observations',
            'recommendations', 'status',
        ]

    def get_student_name(self, obj):
        return obj.student.full_name if hasattr(obj, 'student') else ''

    def get_examiner_name(self, obj):
        return f'{obj.examiner.first_name} {obj.examiner.last_name}' if hasattr(obj, 'examiner') else ''

    def get_authorized_by_name(self, obj):
        if obj.authorized_by:
            return f'{obj.authorized_by.first_name} {obj.authorized_by.last_name}'
        return None


class PracticalEvaluationSerializer(serializers.ModelSerializer):
    instructor_name = serializers.SerializerMethodField()

    class Meta:
        model = PracticalEvaluation
        fields = [
            'id', 'student', 'instructor', 'instructor_name', 'lesson_type', 'lesson_id',
            'date', 'competencies', 'result', 'grade', 'observations',
            'strengths', 'improvements', 'recommendations', 'decision',
        ]

    def get_instructor_name(self, obj):
        if hasattr(obj, 'instructor') and obj.instructor:
            return f'{obj.instructor.first_name} {obj.instructor.last_name}'
        return ''


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionBank
        fields = ['id', 'subject', 'question_text', 'question_type', 'options', 'difficulty', 'created_at']


class QuestionWithAnswerSerializer(serializers.ModelSerializer):
    """Admin view - includes correct answer and explanation."""
    class Meta:
        model = QuestionBank
        fields = ['id', 'subject', 'question_text', 'question_type', 'options', 'correct_answer', 'explanation', 'reference', 'difficulty']


class ExamSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    question_ids = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = ['id', 'code', 'title', 'title_ar', 'title_fr', 'subject', 'program', 'type', 'duration', 'question_count', 'question_ids', 'passing_grade', 'max_attempts', 'status', 'open_date', 'close_date']

    def get_question_count(self, obj):
        fixed = obj.questions.count()
        if fixed:
            return fixed
        return obj.question_count or 0

    def get_question_ids(self, obj):
        return [str(eq.question_id) for eq in obj.questions.all()]

    def _sync_questions(self, instance, question_ids):
        instance.questions.all().delete()
        if question_ids:
            from .models import ExamQuestion
            for i, qid in enumerate(question_ids):
                ExamQuestion.objects.create(exam=instance, question_id=qid, order=i)

    def create(self, validated_data):
        question_ids = self.initial_data.get('question_ids')
        instance = super().create(validated_data)
        if question_ids:
            self._sync_questions(instance, question_ids)
        return instance

    def update(self, instance, validated_data):
        question_ids = self.initial_data.get('question_ids')
        instance = super().update(instance, validated_data)
        if question_ids is not None:
            self._sync_questions(instance, question_ids)
        return instance


class ExamAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    exam_code = serializers.CharField(source='exam.code', read_only=True)
    student = serializers.PrimaryKeyRelatedField(read_only=True)
    score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    is_passed = serializers.BooleanField(read_only=True)
    started_at = serializers.DateTimeField(read_only=True)
    completed_at = serializers.DateTimeField(read_only=True)
    notes = serializers.CharField(read_only=True)

    class Meta:
        model = ExamAttempt
        fields = ['id', 'exam', 'exam_code', 'student', 'student_name', 'attempt', 'score', 'is_passed', 'started_at', 'completed_at', 'notes']

    def get_student_name(self, obj):
        return obj.student.full_name


class QuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['id', 'module', 'title', 'description', 'duration', 'passing_grade', 'max_attempts', 'is_open']


class QuizAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ['id', 'quiz', 'student', 'student_name', 'score', 'started_at', 'completed_at']

    def get_student_name(self, obj):
        return obj.student.full_name


class ExamStartSerializer(serializers.Serializer):
    """Returned when a student starts an exam - includes questions WITHOUT answers."""
    exam_id = serializers.UUIDField()
    exam_code = serializers.CharField()
    title = serializers.CharField()
    duration = serializers.IntegerField()
    attempt_number = serializers.IntegerField()
    questions = QuestionSerializer(many=True)


class ExamSubmitSerializer(serializers.Serializer):
    """Accept exam answers for grading."""
    answers = serializers.DictField(child=serializers.CharField())


class CertificateSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Certificate
        fields = ['id', 'certificate_number', 'student', 'student_name', 'type', 'title', 'title_ar', 'title_fr', 'program', 'issue_date', 'expiry_date', 'file_url', 'status']

    def get_student_name(self, obj):
        return obj.student.full_name


class StudentCompetencySerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentCompetency
        fields = ['id', 'student', 'student_name', 'program', 'competency', 'status', 'achieved_at', 'notes']

    def get_student_name(self, obj):
        return obj.student.full_name if hasattr(obj, 'student') else ''
