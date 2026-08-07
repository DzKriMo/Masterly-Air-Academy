"""
Regression test: the training admin (and the admin Flight Operations hub)
can list student-submitted flight log entries and validate (approve/reject)
them via the shared /flight-log-entries/<id>/validate_entry/ endpoint.
"""
import datetime
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.flight_training.models import FlightLogEntry


def _entry(student, duration=Decimal('1.5'), status='pending'):
    return FlightLogEntry.objects.create(
        student=student,
        date=timezone.now().date() - datetime.timedelta(days=1),
        flight_duration=duration,
        status=status,
    )


def _grant(user, codename):
    from django.contrib.auth.models import Permission
    from django.contrib.contenttypes.models import ContentType
    from apps.accounts.models import User as UserModel
    ct = ContentType.objects.get_for_model(UserModel)
    perm, _ = Permission.objects.get_or_create(
        codename=codename, name=codename, content_type=ct,
    )
    user.user_permissions.add(perm)


@pytest.fixture
def training_admin_user(db):
    from apps.accounts.models import User
    user = User.objects.create_user(
        username='training_admin', email='training@masterly.test',
        password='testpass123', role='training_admin',
        first_name='Sam', last_name='Training',
    )
    _grant(user, 'flight_training.manage')
    return user


@pytest.fixture
def training_admin_client(api_client, training_admin_user):
    api_client.force_authenticate(user=training_admin_user)
    return api_client


@pytest.mark.django_db
class TestTrainingAdminFlightLogValidation:
    def test_lists_all_pending_entries(self, training_admin_client, student_profile, second_student_profile):
        _entry(student_profile)
        _entry(second_student_profile)

        resp = training_admin_client.get('/api/flight-log-entries/')
        assert resp.status_code == 200
        data = resp.data if hasattr(resp, 'data') else resp.json()
        entries = data.get('results', data) if isinstance(data, dict) else data
        assert len(entries) == 2

    def test_approves_entry(self, training_admin_client, student_profile):
        entry = _entry(student_profile)

        resp = training_admin_client.post(f'/api/flight-log-entries/{entry.id}/validate_entry/', {
            'status': 'approved',
            'grade': '8.5',
            'instructor_notes': 'Good handling',
        }, format='json')
        assert resp.status_code == 200
        data = resp.data if hasattr(resp, 'data') else resp.json()
        assert data['status'] == 'approved'
        assert data['grade'] == '8.5'
        assert data['instructor_notes'] == 'Good handling'
        assert data['validated_at'] is not None

    def test_rejects_entry_with_reason(self, training_admin_client, student_profile):
        entry = _entry(student_profile)

        resp = training_admin_client.post(f'/api/flight-log-entries/{entry.id}/validate_entry/', {
            'status': 'rejected',
            'rejection_reason': 'Missing departure time',
        }, format='json')
        assert resp.status_code == 200
        data = resp.data if hasattr(resp, 'data') else resp.json()
        assert data['status'] == 'rejected'
        assert data['rejection_reason'] == 'Missing departure time'
        assert data['grade'] is None

    def test_other_roles_denied(self, api_client, user_student, student_profile):
        entry = _entry(student_profile)
        api_client.force_authenticate(user=user_student)

        resp = api_client.post(f'/api/flight-log-entries/{entry.id}/validate_entry/', {
            'status': 'approved',
        }, format='json')
        assert resp.status_code == 403
