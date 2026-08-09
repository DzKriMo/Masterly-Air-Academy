"""Regression tests for ground evaluation read access.

Students must be able to read their own ground evaluations (the student
dashboard / results / course pages depend on GET /api/ground-evaluations/).
The viewset is write-gated by the standard create/update/delete permissions,
so a view-only student can list but never create or edit evaluations.
"""
import datetime

import pytest

from apps.ground_training.models import Course, GroundEvaluation


@pytest.fixture
def student_ground_user(student_profile):
    """Give the default student the same ground_training.view permission they
    hold in production (they do NOT hold evaluate/create/update)."""
    from django.contrib.auth.models import Permission
    from django.contrib.contenttypes.models import ContentType
    from apps.accounts.models import User
    ct = ContentType.objects.get_for_model(User)
    perm, _ = Permission.objects.get_or_create(
        codename='ground_training.view', name='Ground training view', content_type=ct,
    )
    student_profile.user.user_permissions.add(perm)
    return student_profile.user


@pytest.fixture
def ground_course(db, subject, promotion):
    from apps.accounts.models import User
    from apps.students.models import GroundInstructor
    instructor_user = User.objects.create_user(
        username='ground_instructor_user', email='gi@masterly.test',
        password='testpass123', role='ground_instructor',
        first_name='Ground', last_name='Instructor',
    )
    from django.contrib.auth.models import Permission
    from django.contrib.contenttypes.models import ContentType
    ct = ContentType.objects.get_for_model(User)
    perm, _ = Permission.objects.get_or_create(
        codename='ground_training.view_own', name='Ground training view own', content_type=ct,
    )
    instructor_user.user_permissions.add(perm)
    instructor = GroundInstructor.objects.create(
        user=instructor_user, first_name='Ground', last_name='Instructor',
    )
    return Course.objects.create(
        subject=subject,
        instructor=instructor,
        promotion=promotion,
        title='Aviation Fundamentals',
        scheduled_date=datetime.date(2026, 1, 15),
        start_time=datetime.time(9, 0),
        end_time=datetime.time(11, 0),
    )


def _results(data):
    return data['results'] if isinstance(data, dict) else data


class TestGroundEvaluationReadAccess:
    def test_student_lists_own_ground_evaluations(self, api_client, student_ground_user, student_profile, ground_course):
        GroundEvaluation.objects.create(
            course=ground_course, student=student_profile, grade=95,
            appreciation='Great work', module_validated=True,
        )
        api_client.force_authenticate(user=student_ground_user)
        resp = api_client.get('/api/ground-evaluations/')
        assert resp.status_code == 200, resp.content
        results = _results(resp.json())
        assert len(results) == 1
        assert str(results[0]['student']) == str(student_profile.id)
        assert str(results[0]['grade']) == '95.0'

    def test_student_does_not_see_other_students_evaluations(self, api_client, student_ground_user, student_profile, second_student_profile, ground_course):
        GroundEvaluation.objects.create(course=ground_course, student=second_student_profile, grade=40)
        api_client.force_authenticate(user=student_ground_user)
        resp = api_client.get('/api/ground-evaluations/')
        assert resp.status_code == 200, resp.content
        assert _results(resp.json()) == []

    def test_student_cannot_create_ground_evaluation(self, api_client, student_ground_user, student_profile, ground_course):
        api_client.force_authenticate(user=student_ground_user)
        resp = api_client.post(
            '/api/ground-evaluations/',
            {'course': str(ground_course.id), 'student': str(student_profile.id), 'grade': 95},
            format='json',
        )
        assert resp.status_code == 403

    def test_ground_instructor_lists_evaluations_for_their_courses(self, api_client, student_profile, ground_course):
        GroundEvaluation.objects.create(course=ground_course, student=student_profile, grade=80)
        gi_user = ground_course.instructor.user
        api_client.force_authenticate(user=gi_user)
        resp = api_client.get('/api/ground-evaluations/')
        assert resp.status_code == 200, resp.content
        results = _results(resp.json())
        assert len(results) == 1
        assert str(results[0]['student']) == str(student_profile.id)
