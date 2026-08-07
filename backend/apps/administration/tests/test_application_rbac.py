"""
RBAC regression tests: the application review action must require
`applications.approve` (or `applications.manage` / system admin), not just
`applications.view`.
"""
import pytest
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

from apps.accounts.models import User


def _grant(user, codename):
    ct = ContentType.objects.get_for_model(User)
    perm, _ = Permission.objects.get_or_create(
        codename=codename, name=codename, content_type=ct,
    )
    user.user_permissions.add(perm)


@pytest.fixture
def application(api_client, student_profile):
    from apps.administration.models import Application
    return Application.objects.create(
        application_number='APP-TEST-001',
        student=student_profile,
        status='pending',
    )


@pytest.fixture
def view_only_user(db):
    user = User.objects.create_user(
        username='agent_view', email='agent_view@masterly.test',
        password='testpass123', role='admin_agent',
    )
    _grant(user, 'applications.view')
    return user


@pytest.fixture
def approve_user(db):
    user = User.objects.create_user(
        username='approver', email='approver@masterly.test',
        password='testpass123', role='head_of_training',
    )
    # In production head_of_training holds both view and approve (see seed_roles_permissions)
    _grant(user, 'applications.view')
    _grant(user, 'applications.approve')
    return user


@pytest.fixture
def manage_user(db):
    user = User.objects.create_user(
        username='manager', email='manager@masterly.test',
        password='testpass123', role='admissions_responsible',
    )
    _grant(user, 'applications.manage')
    return user


@pytest.mark.django_db
class TestApplicationReviewRbac:
    def test_view_only_denied(self, api_client, application, view_only_user):
        api_client.force_authenticate(user=view_only_user)
        resp = api_client.post(
            f'/api/applications/{application.id}/review/',
            {'status': 'accepted'}, format='json',
        )
        assert resp.status_code == 403

    def test_approve_allowed(self, api_client, application, approve_user):
        api_client.force_authenticate(user=approve_user)
        resp = api_client.post(
            f'/api/applications/{application.id}/review/',
            {'status': 'reviewed'}, format='json',
        )
        assert resp.status_code == 200
        application.refresh_from_db()
        assert application.status == 'reviewed'

    def test_manage_allowed(self, api_client, application, manage_user):
        api_client.force_authenticate(user=manage_user)
        resp = api_client.post(
            f'/api/applications/{application.id}/review/',
            {'status': 'reviewed'}, format='json',
        )
        assert resp.status_code == 200
