import random
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from apps.accounts.permissions import HasRolePermission
from apps.students.models import Student
from .pdf import generate_certificate_pdf as _cert_pdf
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
    CertificateSerializer, StudentCompetencySerializer,
)
from .services import AutoGradingService, CertificateService
from .bulk_import import import_questions, generate_template


class QuestionBankViewSet(viewsets.ModelViewSet):
    queryset = QuestionBank.objects.select_related('subject').all()
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'
    filterset_fields = ['subject', 'question_type', 'difficulty']
    search_fields = ['question_text']

    def get_serializer_class(self):
        if self.request.user.role in (
            'system_admin', 'training_admin',
            'chief_ground_instructor', 'chief_flight_instructor',
        ):
            return QuestionWithAnswerSerializer
        return QuestionSerializer

    @action(detail=False, methods=['get'], url_path='template')
    def template(self, request):
        from django.http import HttpResponse
        fmt = request.query_params.get('fmt', 'csv')
        if fmt == 'xlsx':
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            filename = 'question_bank_template.xlsx'
        else:
            content_type = 'text/csv'
            filename = 'question_bank_template.csv'
        response = HttpResponse(generate_template(fmt), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['post'], url_path='import')
    def import_bank(self, request):
        upload = request.FILES.get('file')
        if upload is None:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        result = import_questions(upload)
        code = status.HTTP_201_CREATED if result['created'] else status.HTTP_400_BAD_REQUEST
        return Response(result, status=code)


class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.select_related('subject').prefetch_related('questions').annotate(
        fixed_question_count=Count('questions', distinct=True)
    ).all()
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
                return qs.filter(program=student.program, status='active')
            except Student.DoesNotExist:
                return qs.none()
        return qs

    def perform_create(self, serializer):
        exam = serializer.save()
        self._notify_if_published(exam)

    def perform_update(self, serializer):
        exam = serializer.save()
        self._notify_if_published(exam)

    def _notify_if_published(self, exam):
        try:
            if exam.status == 'active':
                from apps.notifications.services import NotificationService
                NotificationService.exam_published(exam)
        except Exception:
            pass

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        exam = self.get_object()
        if exam.status != 'active':
            return Response({'error': 'This exam is not currently active'}, status=400)
        now = timezone.now()
        if exam.open_date and now < exam.open_date:
            return Response({'error': 'This exam has not opened yet'}, status=400)
        if exam.close_date and now > exam.close_date:
            return Response({'error': 'This exam has closed'}, status=400)
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=400)

        with transaction.atomic():
            # Check max attempts
            existing = len(list(
                ExamAttempt.objects.select_for_update()
                .filter(exam=exam, student=student)
                .order_by('-attempt')
            ))
            if existing >= exam.max_attempts:
                return Response({'error': f'Maximum {exam.max_attempts} attempts reached'}, status=400)

            # Get questions — fixed list if ExamQuestion entries exist, else random from subject
            fixed_questions = exam.questions.select_related('question').order_by('order')
            if fixed_questions.exists():
                questions = [eq.question for eq in fixed_questions]
            else:
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

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        exam = self.get_object()
        fixed_questions = exam.questions.select_related('question').order_by('order')
        if fixed_questions.exists():
            questions = [eq.question for eq in fixed_questions]
        else:
            questions = list(QuestionBank.objects.filter(subject=exam.subject))
        serializer = QuestionWithAnswerSerializer(questions, many=True)
        return Response({'exam': ExamSerializer(exam).data, 'questions': serializer.data})

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        exam = self.get_object()
        attempt_id = request.data.get('attempt_id')
        answers = request.data.get('answers', {})

        try:
            attempt = ExamAttempt.objects.get(id=attempt_id, exam=exam)
        except ExamAttempt.DoesNotExist:
            return Response({'error': 'Attempt not found'}, status=404)

        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
            if attempt.student_id != student.id:
                return Response({'error': 'This attempt does not belong to you'}, status=403)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=400)

        if attempt.completed_at:
            return Response({'error': 'This attempt is already completed'}, status=400)

        if attempt.started_at and exam.duration:
            from datetime import timedelta
            if timezone.now() - attempt.started_at > timedelta(minutes=exam.duration):
                return Response({'error': 'Exam duration has elapsed; this attempt can no longer be submitted.'}, status=400)

        question_ids = attempt.answers.get('question_ids') if isinstance(attempt.answers, dict) else None
        result = AutoGradingService.grade_exam(exam, answers, question_ids=question_ids)

        attempt.score = result['percentage']
        attempt.is_passed = result['is_passed']
        attempt.answers = answers
        attempt.completed_at = timezone.now()
        attempt.save()

        # Notify student of exam result
        try:
            from apps.notifications.services import NotificationService
            NotificationService.exam_result(attempt)
        except Exception:
            pass

        if result['is_passed']:
            # Auto-issue certificate on first pass
            cert_exists = Certificate.objects.filter(
                student=attempt.student, type=exam.type or 'exam', program=exam.program
            ).exists()
            if not cert_exists and exam.program:
                try:
                    CertificateService.issue_certificate(
                        attempt.student, exam.program, exam.type or 'exam',
                        title=f'{exam.code} - Passed'
                    )
                except Exception:
                    pass

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
        attempts = ExamAttempt.objects.filter(student=student).select_related('exam', 'student__user')
        return Response(ExamAttemptSerializer(attempts, many=True).data)

    @action(detail=True, methods=['post'], url_path='attempts/(?P<attempt_id>[^/.]+)/grade')
    def grade_attempt(self, request, pk=None, attempt_id=None):
        all_perms = request.user.get_all_permissions()
        has_grade_perm = 'exams.grade' in all_perms or any(p.endswith('.exams.grade') for p in all_perms)
        if not has_grade_perm and request.user.role not in ('system_admin',):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        exam = self.get_object()
        try:
            attempt = ExamAttempt.objects.get(id=attempt_id, exam=exam)
        except ExamAttempt.DoesNotExist:
            return Response({'error': 'Attempt not found'}, status=404)

        grade = request.data.get('grade')
        feedback = request.data.get('feedback', '')

        if grade is not None and grade != '':
            try:
                grade = float(grade)
            except (TypeError, ValueError):
                return Response({'error': 'Invalid grade. Grade must be a number between 0 and 100.'}, status=400)
            if grade < 0 or grade > 100:
                return Response({'error': 'Grade must be between 0 and 100.'}, status=400)
            attempt.score = grade
            attempt.is_passed = grade >= float(exam.passing_grade) if exam.passing_grade else None
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
        if not quiz.is_open:
            return Response({'error': 'This quiz is not open'}, status=400)
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=400)

        from django.db import transaction
        with transaction.atomic():
            existing = QuizAttempt.objects.select_for_update().filter(quiz=quiz, student=student).count()
            if existing >= quiz.max_attempts:
                return Response({'error': f'Maximum {quiz.max_attempts} attempts reached'}, status=400)

            all_questions = list(QuestionBank.objects.filter(subject__modules=quiz.module))
            if not all_questions:
                return Response({'error': 'No questions available for this quiz module'}, status=400)
            questions = random.sample(all_questions, min(10, len(all_questions)))

            attempt = QuizAttempt.objects.create(
                quiz=quiz, student=student,
                answers={'question_ids': [str(q.id) for q in questions]},
            )

        return Response({
            'attempt_id': str(attempt.id),
            'quiz_id': str(quiz.id),
            'title': quiz.title,
            'duration': quiz.duration,
            'questions': QuestionSerializer(questions, many=True).data,
        })

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        quiz = self.get_object()
        if not quiz.is_open:
            return Response({'error': 'This quiz is not open'}, status=400)
        answers = request.data.get('answers', {})
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=400)

        existing = QuizAttempt.objects.filter(quiz=quiz, student=student).count()
        if existing >= quiz.max_attempts:
            return Response({'error': f'Maximum {quiz.max_attempts} attempts reached'}, status=400)

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
    serializer_class = StudentCompetencySerializer
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
        all_perms = request.user.get_all_permissions()
        has_evaluate_perm = 'flight_training.evaluate' in all_perms or any(p.endswith('.flight_training.evaluate') for p in all_perms)
        if not has_evaluate_perm and request.user.role not in ('system_admin',):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
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
        all_perms = request.user.get_all_permissions()
        has_evaluate_perm = 'flight_training.evaluate' in all_perms or any(p.endswith('.flight_training.evaluate') for p in all_perms)
        if not has_evaluate_perm and request.user.role not in ('system_admin',):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        skill_test = self.get_object()
        instructor_id = request.data.get('authorized_by')
        instructor = None
        if instructor_id:
            from apps.students.models import FlightInstructor
            try:
                instructor = FlightInstructor.objects.get(id=instructor_id)
            except FlightInstructor.DoesNotExist:
                return Response({'error': 'Flight instructor not found'}, status=400)
        skill_test.status = 'authorized'
        skill_test.authorized_by = instructor
        skill_test.save()

        from apps.notifications.services import NotificationService
        NotificationService.skill_test_authorized(skill_test)

        return Response(SkillTestSerializer(skill_test).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        all_perms = request.user.get_all_permissions()
        has_evaluate_perm = 'flight_training.evaluate' in all_perms or any(p.endswith('.flight_training.evaluate') for p in all_perms)
        if not has_evaluate_perm and request.user.role not in ('system_admin',):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        skill_test = self.get_object()
        skill_test.status = 'completed'
        skill_test.completed_date = timezone.now()
        skill_test.result = request.data.get('result', skill_test.result)
        skill_test.report_url = request.data.get('report_url', skill_test.report_url)
        skill_test.observations = request.data.get('observations', skill_test.observations)
        skill_test.recommendations = request.data.get('recommendations', skill_test.recommendations)
        skill_test.exercises = request.data.get('exercises', skill_test.exercises)
        skill_test.save()

        # If passed, auto-issue certificate
        if skill_test.result == 'passed':
            try:
                from .services import CertificateService
                certificate = CertificateService.issue_certificate(
                    skill_test.student,
                    skill_test.student.program,
                    'skill_test',
                    title=f'Skill Test - Passed'
                )
                from apps.notifications.services import NotificationService
                NotificationService.certificate_issued(certificate)
            except Exception:
                pass

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
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        if self.request.user.role == 'flight_instructor':
            return qs.filter(student__main_instructor__user=self.request.user)
        if self.request.user.role == 'chief_flight_instructor':
            return qs
        return qs


class ExamAttemptViewSet(viewsets.ModelViewSet):
    serializer_class = ExamAttemptSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'
    filterset_fields = ['exam', 'student', 'is_passed']

    def get_queryset(self):
        qs = ExamAttempt.objects.select_related('exam', 'student').all()
        if self.request.user.role == 'student':
            from apps.students.models import Student
            try:
                student = Student.objects.get(user=self.request.user)
                return qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        if self.request.user.role == 'flight_instructor':
            return qs.filter(student__main_instructor__user=self.request.user)
        return qs


class CertificatePdfView(APIView):
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'exams.view'

    def get(self, request, cert_id):
        try:
            cert = Certificate.objects.get(id=cert_id)
        except Certificate.DoesNotExist:
            return Response({'error': 'Certificate not found'}, status=404)
        if request.user.role == 'student':
            try:
                student = Student.objects.get(user=request.user)
            except Student.DoesNotExist:
                return Response({'error': 'Student profile not found'}, status=404)
            if cert.student_id != student.id:
                return Response({'error': 'Permission denied'}, status=403)
        return _cert_pdf(cert)
