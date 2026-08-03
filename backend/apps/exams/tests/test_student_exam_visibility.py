"""Tests for student-facing exam visibility (only active exams are shown)."""
import pytest


@pytest.fixture
def exam_student_user(student_profile):
    """Give the default student user the exams.view permission used in production."""
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
    """An exam in active state (the only status students should see)."""
    exam.status = 'active'
    exam.save()
    return exam


@pytest.fixture
def draft_exam(db, exam):
    """A separate exam in draft state (not active)."""
    from apps.exams.models import Exam
    return Exam.objects.create(
        code='AVI101-DRAFT',
        title='Draft Exam',
        subject=exam.subject,
        program=exam.program,
        duration=60,
        question_count=2,
        passing_grade=70,
        status='draft',
    )


class TestStudentExamVisibility:
    def test_student_only_sees_active_exams(self, api_client, exam_student_user, active_exam, draft_exam):
        """Students must not see exams whose status is not 'active'."""
        api_client.force_authenticate(user=exam_student_user)
        resp = api_client.get('/api/exams/')
        assert resp.status_code == 200, resp.content
        codes = [e['code'] for e in resp.data['results']]
        assert active_exam.code in codes
        assert draft_exam.code not in codes

    def test_student_does_not_see_draft_exams(self, api_client, exam_student_user, draft_exam):
        """A draft exam is hidden entirely from the student list."""
        api_client.force_authenticate(user=exam_student_user)
        resp = api_client.get('/api/exams/')
        assert resp.status_code == 200, resp.content
        codes = [e['code'] for e in resp.data['results']]
        assert draft_exam.code not in codes
