from rest_framework import serializers
from .models import (
    QuestionBank, Quiz, QuizAttempt, Exam, ExamAttempt,
    PracticalEvaluation, StudentCompetency,
    ProgressCheck, SkillTest, Certificate,
)


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

    class Meta:
        model = Exam
        fields = ['id', 'code', 'title', 'subject', 'program', 'type', 'duration', 'question_count', 'passing_grade', 'max_attempts', 'status', 'open_date', 'close_date']

    def get_question_count(self, obj):
        return obj.question_count or 0


class ExamAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    exam_code = serializers.CharField(source='exam.code', read_only=True)

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

    class Meta:
        model = Certificate
        fields = ['id', 'certificate_number', 'student', 'student_name', 'type', 'title', 'program', 'issue_date', 'expiry_date', 'file_url', 'status']

    def get_student_name(self, obj):
        return obj.student.full_name
