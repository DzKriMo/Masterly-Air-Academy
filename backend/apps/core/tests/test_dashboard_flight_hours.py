"""
Regression test for the student dashboard flight-hours calculation.

The dashboard total must match the flight log: completed FlightLesson
records plus approved FlightLogEntry records only. Scheduled lessons with
no duration and unapproved log entries must be excluded.
"""
from decimal import Decimal

import pytest
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from apps.accounts.models import User
from apps.flight_training.models import FlightLesson, FlightLogEntry


def _grant(user, codename):
    ct = ContentType.objects.get_for_model(User)
    perm, _ = Permission.objects.get_or_create(
        codename=codename, name=codename, content_type=ct,
    )
    user.user_permissions.add(perm)


@pytest.fixture
def student_client(api_client, user_student, student_profile):
    _grant(user_student, 'students.view_own')
    api_client.force_authenticate(user=user_student)
    return api_client


def _lesson(student, instructor, aircraft, status, duration, days_ago):
    return FlightLesson.objects.create(
        student=student, instructor=instructor, aircraft=aircraft,
        scheduled_date=timezone.now().date() - timezone.timedelta(days=days_ago),
        status=status,
        flight_duration=Decimal(str(duration)) if duration is not None else None,
    )


def _log_entry(student, status, duration, days_ago):
    return FlightLogEntry.objects.create(
        student=student,
        date=timezone.now().date() - timezone.timedelta(days=days_ago),
        flight_duration=Decimal(str(duration)),
        status=status,
    )


@pytest.mark.django_db
class TestStudentDashboardFlightHours:
    def test_total_matches_completed_lessons_plus_approved_log(
        self, student_client, student_profile, flight_instructor_profile, aircraft
    ):
        # Completed lessons: 1.5 + 2.0 = 3.5
        _lesson(student_profile, flight_instructor_profile, aircraft, 'completed', 1.5, 1)
        _lesson(student_profile, flight_instructor_profile, aircraft, 'completed', 2.0, 2)
        # Scheduled lessons with no duration — must NOT count
        _lesson(student_profile, flight_instructor_profile, aircraft, 'scheduled', None, 3)
        _lesson(student_profile, flight_instructor_profile, aircraft, 'scheduled', None, 4)
        # Approved log entries: 2.0 + 2.2 + 2.0 = 6.2
        _log_entry(student_profile, 'approved', 2.0, 5)
        _log_entry(student_profile, 'approved', 2.2, 6)
        _log_entry(student_profile, 'approved', 2.0, 7)
        # Pending log entry — must NOT count
        _log_entry(student_profile, 'pending', 5.0, 8)

        resp = student_client.get('/api/student/dashboard/')
        assert resp.status_code == 200
        data = resp.json()
        assert data['total_flight_hours'] == 9.7
        assert data['total_lessons_completed'] == 2

    def test_scheduled_only_lesson_yields_zero_hours(
        self, student_client, student_profile, flight_instructor_profile, aircraft
    ):
        _lesson(student_profile, flight_instructor_profile, aircraft, 'scheduled', None, 1)

        resp = student_client.get('/api/student/dashboard/')
        assert resp.status_code == 200
        assert resp.json()['total_flight_hours'] == 0
