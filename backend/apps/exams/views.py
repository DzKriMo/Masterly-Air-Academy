from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from apps.accounts.permissions import HasRolePermission
from .models import (
    QuestionBank, Quiz, QuizAttempt, Exam, ExamAttempt,
    PracticalEvaluation, StudentCompetency,
    ProgressCheck, SkillTest, Certificate,
)
from .serializers import (
    QuestionSerializer, QuestionWithAnswerSerializer,
    ExamSerializer, ExamAttemptSerializer,
    QuizSerializer, QuizAttemptSerializer,
    ExamStartSerializer, ExamSubmitSerializer,
    CertificateSerializer,
)
from .services import AutoGradingService, CertificateService


class QuestionBankViewSet(viewsets.ModelViewSet):
    queryset = QuestionBank.objects.select_related('subject').all()
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'
    filterset_fields = ['subject', 'question_type', 'difficulty']
    search_fields = ['question_text']

    def get_serializer_class(self):
        if self.request.user.role in ('system_admin', 'chief_ground_instructor', 'chief_flight_instructor'):
            return QuestionWithAnswerSerializer
        return QuestionSerializer


class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.select_related('subject').all()
    serializer_class = ExamSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'
    filterset_fields = ['program', 'type', 'status']

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        exam = self.get_object()
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=400)

        # Check max attempts
        existing = ExamAttempt.objects.filter(exam=exam, student=student).count()
        if existing >= exam.max_attempts:
            return Response({'error': f'Maximum {exam.max_attempts} attempts reached'}, status=400)

        # Get questions (random subset)
        questions = QuestionBank.objects.filter(subject=exam.subject)[:exam.question_count or 20]
        if not questions:
            return Response({'error': 'No questions available for this exam'}, status=400)

        attempt = ExamAttempt.objects.create(
            exam=exam, student=student,
            attempt=existing + 1, started_at=timezone.now(),
        )

        return Response({
            'attempt_id': str(attempt.id),
            'exam_id': str(exam.id),
            'exam_code': exam.code,
            'title': exam.title,
            'duration': exam.duration,
            'attempt_number': attempt.attempt,
            'questions': QuestionSerializer(questions, many=True).data,
        })

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        exam = self.get_object()
        attempt_id = request.data.get('attempt_id')
        answers = request.data.get('answers', {})

        try:
            attempt = ExamAttempt.objects.get(id=attempt_id, exam=exam)
        except ExamAttempt.DoesNotExist:
            return Response({'error': 'Attempt not found'}, status=404)

        if attempt.completed_at:
            return Response({'error': 'This attempt is already completed'}, status=400)

        result = AutoGradingService.grade_exam(exam, answers)

        attempt.score = result['percentage']
        attempt.is_passed = result['is_passed']
        attempt.answers = answers
        attempt.completed_at = timezone.now()
        attempt.save()

        if result['is_passed']:
            # Auto-issue certificate on first pass
            cert_exists = Certificate.objects.filter(
                student=attempt.student, type=exam.type or 'exam', program=exam.program
            ).exists()
            if not cert_exists and exam.program:
                CertificateService.issue_certificate(
                    attempt.student, exam.program, exam.type or 'exam',
                    title=f'{exam.code} - Passed'
                )

        return Response({
            'score': result['score'],
            'total': result['total'],
            'percentage': result['percentage'],
            'is_passed': result['is_passed'],
            'passing_grade': result['passing_grade'],
            'details': result['details'],
        })

    @action(detail=False, methods=['get'])
    def my_attempts(self, request):
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response([])
        attempts = ExamAttempt.objects.filter(student=student).select_related('exam')
        return Response(ExamAttemptSerializer(attempts, many=True).data)


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.select_related('module').all()
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        quiz = self.get_object()
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=400)

        questions = QuestionBank.objects.filter(subject__modules=quiz.module)[:10]
        if not questions:
            questions = QuestionBank.objects.all()[:10]

        return Response({
            'quiz_id': str(quiz.id),
            'title': quiz.title,
            'duration': quiz.duration,
            'questions': QuestionSerializer(questions, many=True).data,
        })

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        quiz = self.get_object()
        answers = request.data.get('answers', {})
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=400)

        result = AutoGradingService.grade_quiz(quiz, answers)
        QuizAttempt.objects.create(
            quiz=quiz, student=student,
            score=result['percentage'], completed_at=timezone.now(),
        )
        return Response(result)


class CertificateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Certificate.objects.select_related('student').all()
        if self.request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        return qs

    def get_serializer_class(self):
        return CertificateSerializer


class StudentCompetencyViewSet(viewsets.ModelViewSet):
    queryset = StudentCompetency.objects.select_related('student').all()
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'
    filterset_fields = ['student', 'program', 'status']
