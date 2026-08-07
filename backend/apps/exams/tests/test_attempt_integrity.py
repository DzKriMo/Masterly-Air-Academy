"""
Regression tests for attempt integrity fixes:

- C1/C2: quiz submit updates the started attempt (no duplicate rows) and
  grades against the exact delivered question set.
- C3: exam/quiz start resumes a dangling attempt instead of burning one.
- C4/H7: preview and question-bank import are gated to staff/managers.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


def _auth_headers(user):
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


@pytest.fixture
def student_client(user_student):
    return APIClient()


@pytest.fixture
def exam_student(student_profile):
    """Student user with the exams.view permission used in production."""
    from django.contrib.auth.models import Permission
    from django.contrib.contenttypes.models import ContentType
    from apps.accounts.models import User
    ct = ContentType.objects.get_for_model(User)
    perm, _ = Permission.objects.get_or_create(
        codename='exams.view', name='Exams view', content_type=ct,
    )
    student_profile.user.user_permissions.add(perm)
    return student_profile.user


@pytest.fixture
def active_exam(exam):
    exam.status = 'active'
    exam.save()
    return exam


@pytest.fixture
def quiz_module(subject):
    from apps.ground_training.models import Module
    return Module.objects.create(
        subject=subject, title='Integrity Module', duration=10, order=1,
    )


@pytest.fixture
def open_quiz(quiz_module):
    from apps.exams.models import Quiz
    return Quiz.objects.create(
        module=quiz_module, title='Integrity Quiz',
        passing_grade=70.0, max_attempts=1, is_open=True,
    )


@pytest.fixture
def quiz_questions(subject, quiz_module):
    from apps.exams.models import QuestionBank
    return [
        QuestionBank.objects.create(
            subject=subject, module=quiz_module,
            question_text=f'Q{i}', question_type='mcq',
            correct_answer=f'ans{i}', difficulty='easy',
        )
        for i in (1, 2, 3)
    ]


@pytest.mark.django_db
class TestExamStartResume:
    """Exam start reuses a dangling attempt (C3)."""

    def test_start_resumes_dangling_attempt(
        self, student_client, exam_student, student_profile, active_exam, exam_questions
    ):
        client = student_client
        headers = _auth_headers(exam_student)

        r1 = client.post(f'/api/exams/{active_exam.id}/start/', **headers)
        assert r1.status_code == 200, r1.data
        attempt_id = r1.data['attempt_id']

        r2 = client.post(f'/api/exams/{active_exam.id}/start/', **headers)
        assert r2.status_code == 200, r2.data
        assert r2.data['attempt_id'] == attempt_id
        assert r2.data['attempt_number'] == r1.data['attempt_number']

        from apps.exams.models import ExamAttempt
        assert ExamAttempt.objects.filter(student=student_profile).count() == 1

    def test_new_attempt_after_completion(
        self, student_client, exam_student, student_profile, active_exam, exam_questions
    ):
        from apps.exams.models import ExamAttempt
        client = student_client
        headers = _auth_headers(exam_student)

        r1 = client.post(f'/api/exams/{active_exam.id}/start/', **headers)
        attempt_id = r1.data['attempt_id']

        answers = {
            str(q.id): q.correct_answer for q in exam_questions
        }
        sub = client.post(
            f'/api/exams/{active_exam.id}/submit/',
            {'attempt_id': attempt_id, 'answers': answers},
            format='json', **headers,
        )
        assert sub.status_code == 200, sub.data
        assert sub.data['score'] == 2

        r2 = client.post(f'/api/exams/{active_exam.id}/start/', **headers)
        assert r2.status_code == 200, r2.data
        assert r2.data['attempt_id'] != attempt_id
        assert r2.data['attempt_number'] == 2
        assert ExamAttempt.objects.filter(student=student_profile).count() == 2

    def test_resume_preserves_delivered_questions(
        self, student_client, exam_student, student_profile, active_exam, exam_questions
    ):
        client = student_client
        headers = _auth_headers(exam_student)

        r1 = client.post(f'/api/exams/{active_exam.id}/start/', **headers)
        delivered = {q['id'] for q in r1.data['questions']}
        assert delivered == {str(q.id) for q in exam_questions}

        r2 = client.post(f'/api/exams/{active_exam.id}/start/', **headers)
        resumed = {q['id'] for q in r2.data['questions']}
        assert resumed == delivered


@pytest.mark.django_db
class TestQuizAttemptIntegrity:
    """Quiz submit updates the started attempt (C1/C2)."""

    def test_submit_updates_started_attempt(
        self, student_client, exam_student, student_profile, open_quiz, quiz_questions
    ):
        from apps.exams.models import QuizAttempt
        client = student_client
        headers = _auth_headers(exam_student)

        r1 = client.post(f'/api/quizzes/{open_quiz.id}/start/', **headers)
        assert r1.status_code == 200, r1.data
        attempt_id = r1.data['attempt_id']

        answers = {str(q.id): q.correct_answer for q in quiz_questions}
        sub = client.post(
            f'/api/quizzes/{open_quiz.id}/submit/',
            {'attempt_id': attempt_id, 'answers': answers},
            format='json', **headers,
        )
        assert sub.status_code == 200, sub.data
        assert sub.data['score'] == len(quiz_questions)

        attempts = QuizAttempt.objects.filter(student=student_profile)
        assert attempts.count() == 1
        attempt = attempts.first()
        assert attempt.completed_at is not None
        assert attempt.score == 100.0

    def test_submit_requires_attempt_id(
        self, student_client, exam_student, student_profile, open_quiz, quiz_questions
    ):
        client = student_client
        headers = _auth_headers(exam_student)
        r = client.post(
            f'/api/quizzes/{open_quiz.id}/submit/',
            {'answers': {}},
            format='json', **headers,
        )
        assert r.status_code == 400

    def test_duplicate_submit_rejected(
        self, student_client, exam_student, student_profile, open_quiz, quiz_questions
    ):
        from apps.exams.models import QuizAttempt
        client = student_client
        headers = _auth_headers(exam_student)

        r1 = client.post(f'/api/quizzes/{open_quiz.id}/start/', **headers)
        attempt_id = r1.data['attempt_id']
        answers = {str(q.id): q.correct_answer for q in quiz_questions}

        r2 = client.post(
            f'/api/quizzes/{open_quiz.id}/submit/',
            {'attempt_id': attempt_id, 'answers': answers},
            format='json', **headers,
        )
        assert r2.status_code == 200

        r3 = client.post(
            f'/api/quizzes/{open_quiz.id}/submit/',
            {'attempt_id': attempt_id, 'answers': answers},
            format='json', **headers,
        )
        assert r3.status_code == 400
        assert QuizAttempt.objects.filter(student=student_profile).count() == 1

    def test_start_resumes_dangling_quiz_attempt(
        self, student_client, exam_student, student_profile, open_quiz, quiz_questions
    ):
        from apps.exams.models import QuizAttempt
        client = student_client
        headers = _auth_headers(exam_student)

        r1 = client.post(f'/api/quizzes/{open_quiz.id}/start/', **headers)
        attempt_id = r1.data['attempt_id']

        r2 = client.post(f'/api/quizzes/{open_quiz.id}/start/', **headers)
        assert r2.status_code == 200
        assert r2.data['attempt_id'] == attempt_id
        assert QuizAttempt.objects.filter(student=student_profile).count() == 1


@pytest.mark.django_db
class TestStaffOnlyEndpoints:
    """Preview and question-bank import must not be student-accessible (C4/H7)."""

    def test_preview_denied_for_student(
        self, student_client, exam_student, student_profile, active_exam, exam_questions
    ):
        r = student_client.get(f'/api/exams/{active_exam.id}/preview/', **_auth_headers(exam_student))
        assert r.status_code == 403

    def test_import_denied_for_student(
        self, student_client, exam_student, student_profile
    ):
        r = student_client.post('/api/question-bank/import/', {}, **_auth_headers(exam_student))
        assert r.status_code == 403
