import random
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
    ProgressCheckSerializer, SkillTestSerializer,
    PracticalEvaluationSerializer,
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

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(program=student.program)
            except Student.DoesNotExist:
                return qs.none()
        return qs

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

        # Get questions (random subset, snapshot IDs in attempt)
        all_questions = list(QuestionBank.objects.filter(subject=exam.subject))
        count = exam.question_count or 20
        if len(all_questions) < count:
            return Response({'error': f'Not enough questions. Need {count}, have {len(all_questions)}.'}, status=400)
        questions = random.sample(all_questions, count)

        attempt = ExamAttempt.objects.create(
            exam=exam, student=student,
            attempt=existing + 1, started_at=timezone.now(),
            answers={'question_ids': [str(q.id) for q in questions]},
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

        question_ids = attempt.answers.get('question_ids') if isinstance(attempt.answers, dict) else None
        result = AutoGradingService.grade_exam(exam, answers, question_ids=question_ids)

        attempt.score = result['percentage']
        attempt.is_passed = result['is_passed']
        attempt.answers = answers
        attempt.completed_at = timezone.now()
        attempt.save()

        # Notify student of exam result
        from apps.notifications.services import NotificationService
        NotificationService.exam_result(attempt)

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

    @action(detail=True, methods=['post'], url_path='attempts/(?P<attempt_id>[^/.]+)/grade')
    def grade_attempt(self, request, pk=None, attempt_id=None):
        exam = self.get_object()
        try:
            attempt = ExamAttempt.objects.get(id=attempt_id, exam=exam)
        except ExamAttempt.DoesNotExist:
            return Response({'error': 'Attempt not found'}, status=404)

        grade = request.data.get('grade')
        feedback = request.data.get('feedback', '')

        if grade is not None:
            attempt.score = grade
            attempt.is_passed = float(grade) >= float(exam.passing_grade) if exam.passing_grade else None
        attempt.notes = feedback
        attempt.graded_by = request.user
        attempt.save()

        # Notify student
        from apps.notifications.services import NotificationService
        NotificationService.exam_result(attempt)

        return Response(ExamAttemptSerializer(attempt).data)


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.select_related('module').all()
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(module__subject__program=student.program)
            except Student.DoesNotExist:
                return qs.none()
        return qs

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        quiz = self.get_object()
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=400)

        existing = QuizAttempt.objects.filter(quiz=quiz, student=student).count()
        if existing >= quiz.max_attempts:
            return Response({'error': f'Maximum {quiz.max_attempts} attempts reached'}, status=400)

        all_questions = list(QuestionBank.objects.filter(subject__modules=quiz.module))
        if not all_questions:
            return Response({'error': 'No questions available for this quiz module'}, status=400)
        questions = random.sample(all_questions, min(10, len(all_questions)))

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
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'

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

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(student__user=self.request.user)
        return qs


class ProgressCheckViewSet(viewsets.ModelViewSet):
    queryset = ProgressCheck.objects.select_related('student', 'examiner').all()
    serializer_class = ProgressCheckSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(student__user=self.request.user)
        if self.request.user.role in ('flight_instructor', 'chief_flight_instructor'):
            return qs.filter(examiner__user=self.request.user)
        return qs

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        progress_check = self.get_object()
        progress_check.status = 'completed'
        progress_check.completed_date = timezone.now()
        progress_check.result = request.data.get('result', progress_check.result)
        progress_check.observations = request.data.get('observations', progress_check.observations)
        progress_check.lessons_to_repeat = request.data.get('lessons_to_repeat', progress_check.lessons_to_repeat)
        progress_check.save()
        return Response(ProgressCheckSerializer(progress_check).data)

    @action(detail=False, methods=['post'])
    def schedule(self, request, pk=None):
        serializer = ProgressCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        check = serializer.save()

        from apps.notifications.services import NotificationService
        NotificationService.progress_check_scheduled(check)

        return Response(ProgressCheckSerializer(check).data, status=status.HTTP_201_CREATED)


class SkillTestViewSet(viewsets.ModelViewSet):
    queryset = SkillTest.objects.select_related('student', 'examiner', 'authorized_by').all()
    serializer_class = SkillTestSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(student__user=self.request.user)
        if self.request.user.role in ('flight_instructor', 'chief_flight_instructor'):
            return qs.filter(examiner__user=self.request.user)
        return qs

    @action(detail=True, methods=['post'])
    def authorize(self, request, pk=None):
        skill_test = self.get_object()
        skill_test.status = 'authorized'
        skill_test.authorized_by = request.data.get('authorized_by', None)
        if skill_test.authorized_by:
            from apps.students.models import FlightInstructor
            try:
                skill_test.authorized_by = FlightInstructor.objects.get(id=skill_test.authorized_by)
            except FlightInstructor.DoesNotExist:
                pass
        skill_test.save()

        from apps.notifications.services import NotificationService
        NotificationService.skill_test_authorized(skill_test)

        return Response(SkillTestSerializer(skill_test).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        skill_test = self.get_object()
        skill_test.status = 'completed'
        skill_test.completed_date = timezone.now()
        skill_test.result = request.data.get('result', skill_test.result)
        skill_test.report_url = request.data.get('report_url', skill_test.report_url)
        skill_test.observations = request.data.get('observations', skill_test.observations)
        skill_test.recommendations = request.data.get('recommendations', skill_test.recommendations)
        skill_test.save()

        # If passed, auto-issue certificate
        if skill_test.result == 'passed':
            from .services import CertificateService
            certificate = CertificateService.issue_certificate(
                skill_test.student,
                skill_test.student.program,
                'skill_test',
                title=f'Skill Test - Passed'
            )
            from apps.notifications.services import NotificationService
            NotificationService.certificate_issued(certificate)

        return Response(SkillTestSerializer(skill_test).data)


class PracticalEvaluationViewSet(viewsets.ModelViewSet):
    queryset = PracticalEvaluation.objects.select_related('student', 'instructor').all()
    serializer_class = PracticalEvaluationSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'flight_training.view'

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            return qs.filter(student__user=self.request.user)
        if self.request.user.role in ('flight_instructor', 'chief_flight_instructor'):
            return qs.filter(instructor__user=self.request.user)
        return qs


class QuizAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = QuizAttempt.objects.select_related('quiz', 'student').all()
    serializer_class = QuizAttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        return qs
