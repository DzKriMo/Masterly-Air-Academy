"""
Global pytest configuration and fixtures for Masterly Air Academy.

All auto-used fixtures (e.g. throttle disable, Meilisearch mock) are applied
to every test automatically. Named fixtures (user_student, auth_client, etc.)
must be explicitly requested by each test.

Database backend is configured in ``config/test_settings.py`` (SQLite in-memory).
"""
import datetime
from unittest.mock import patch

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# ---------------------------------------------------------------------------
# Global test-environment overrides
# ---------------------------------------------------------------------------

@pytest.fixture(scope='session', autouse=True)
def _disable_sqlite_fk_check_session():
    """
    Session-scoped patch that disables Django 5.1's SQLite FK constraint check
    during ``_fixture_teardown()``.  This is needed because ``check_constraints``
    is called *during* teardown, after any function-scoped fixture (including
    monkeypatch) would have already been reverted.
    """
    from unittest.mock import patch
    patcher = patch(
        'django.db.backends.sqlite3.base.DatabaseWrapper.check_constraints',
        lambda self, table_names=None: None,
    )
    patcher.start()
    yield
    patcher.stop()


@pytest.fixture(autouse=True)
def _disable_throttling():
    """Disable all DRF throttling during tests to avoid rate-limit errors."""
    rates = settings.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {})
    for key in list(rates.keys()):
        rates[key] = '1000/min'
    # Also ensure commonly used keys exist
    for key in ('login', 'anon', 'user'):
        rates.setdefault(key, '1000/min')


@pytest.fixture(autouse=True)
def _disable_meilisearch():
    """Mock Meilisearch availability so URL loading never blocks."""
    patcher = patch('apps.core.search.MEILI_AVAILABLE', False)
    patcher.start()
    yield
    patcher.stop()


# ---------------------------------------------------------------------------
# User fixtures  (roles mirroring UserRole choices)
# ---------------------------------------------------------------------------

@pytest.fixture
def user_student(db):
    return User.objects.create_user(
        username='student_user',
        email='student@masterly.test',
        password='testpass123',
        role='student',
        first_name='John',
        last_name='Doe',
    )


@pytest.fixture
def user_instructor(db):
    return User.objects.create_user(
        username='instructor_user',
        email='instructor@masterly.test',
        password='testpass123',
        role='flight_instructor',
        first_name='Jane',
        last_name='Smith',
    )


@pytest.fixture
def user_admin(db):
    return User.objects.create_user(
        username='admin_user',
        email='admin@masterly.test',
        password='testpass123',
        role='system_admin',
        first_name='Admin',
        last_name='User',
    )


# ---------------------------------------------------------------------------
# Core model fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def academic_year(db):
    from apps.core.models import AcademicYear
    return AcademicYear.objects.create(
        name='2025-2026',
        start_date=datetime.date(2025, 9, 1),
        end_date=datetime.date(2026, 8, 31),
    )


# ---------------------------------------------------------------------------
# Student profile fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def student_profile(db, user_student, academic_year):
    from apps.students.models import Student
    return Student.objects.create(
        user=user_student,
        student_number='STU-001',
        first_name='John',
        last_name='Doe',
        date_of_birth=datetime.date(2000, 1, 15),
        nationality='US',
        address='123 Aviation Way',
        phone='+123456789',
        enrollment_date=datetime.date(2025, 9, 1),
        status='active',
        program='PPL',
        academic_year=academic_year,
    )


@pytest.fixture
def second_student_profile(db, academic_year):
    """A second student unlinked from the default user_student."""
    from apps.students.models import Student
    from django.contrib.auth import get_user_model
    User = get_user_model()
    other_user = User.objects.create_user(
        username='other_student', email='other@masterly.test',
        password='testpass123', role='student',
        first_name='Alice', last_name='Wonder',
    )
    return Student.objects.create(
        user=other_user,
        student_number='STU-002',
        first_name='Alice',
        last_name='Wonder',
        date_of_birth=datetime.date(1999, 5, 20),
        enrollment_date=datetime.date(2025, 9, 1),
        status='active',
        program='CPL',
        academic_year=academic_year,
    )


# ---------------------------------------------------------------------------
# Flight instructor profile fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def flight_instructor_profile(db, user_instructor):
    from apps.students.models import FlightInstructor
    return FlightInstructor.objects.create(
        user=user_instructor,
        first_name='Jane',
        last_name='Smith',
        license_number='FI-001',
        qualifications=['CFI', 'MEI'],
        authorized_aircraft_types=['172', 'PA28'],
        total_flight_hours=2500.0,
        instruction_hours=1200.0,
        status='active',
        hire_date=datetime.date(2020, 3, 1),
    )


# ---------------------------------------------------------------------------
# Aircraft fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def aircraft(db):
    from apps.flight_training.models import Aircraft
    return Aircraft.objects.create(
        registration='G-ABCD',
        manufacturer='Cessna',
        model='172',
        serial_number='172-12345',
        year_of_manufacture=2015,
        base_location='Main Airport',
        status='available',
        airframe_hours=5000.0,
        engine_hours=1200.0,
    )


# ---------------------------------------------------------------------------
# Exam / Subject fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def subject(db):
    from apps.ground_training.models import Subject
    return Subject.objects.create(
        code='AVI101',
        title_en='Aviation Fundamentals',
        title_fr='Fondamentaux de l aviation',
        title_ar='أساسيات الطيران',
        total_hours=40,
        program='PPL',
    )


@pytest.fixture
def exam(db, subject):
    from apps.exams.models import Exam
    return Exam.objects.create(
        code='AVI101-FINAL',
        title='Aviation Fundamentals Final Exam',
        subject=subject,
        program='PPL',
        duration=60,
        question_count=2,
        passing_grade=70,
        status='published',
    )


@pytest.fixture
def exam_questions(db, subject):
    """Create a small set of question-bank entries for the subject."""
    from apps.exams.models import QuestionBank
    q1 = QuestionBank.objects.create(
        subject=subject,
        question_text='What is the standard atmospheric pressure at sea level?',
        question_type='mcq',
        options=['1013.25 hPa', '1031.25 hPa', '1000.0 hPa', '1050.0 hPa'],
        correct_answer='1013.25 hPa',
        difficulty='easy',
    )
    q2 = QuestionBank.objects.create(
        subject=subject,
        question_text='What does VFR stand for?',
        question_type='mcq',
        options=['Visual Flight Rules', 'Very Fast Route',
                 'Virtual Flight Report', 'Variable Frequency Radio'],
        correct_answer='Visual Flight Rules',
        difficulty='easy',
    )
    return [q1, q2]


# ---------------------------------------------------------------------------
# API client fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    """Plain DRF APIClient with no authentication."""
    return APIClient()


@pytest.fixture
def auth_client(user_admin):
    """APIClient pre-authenticated with a valid JWT for a system_admin user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user_admin)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client
