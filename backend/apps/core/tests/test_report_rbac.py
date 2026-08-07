"""
RBAC regression tests for the report/backup endpoints:

- Reports no longer accept every authenticated user (previous HasRolePermission
  footgun let un-authenticated-permission function views pass everyone).
- The DB backup endpoint is gated to settings.manage.
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
def plain_user(db):
    return User.objects.create_user(
        username='plain', email='plain@masterly.test',
        password='testpass123', role='admin_agent',
    )


@pytest.fixture
def finance_user(db):
    user = User.objects.create_user(
        username='fin', email='fin@masterly.test',
        password='testpass123', role='finance_responsible',
    )
    _grant(user, 'finance.view_reports')
    return user


@pytest.mark.django_db
class TestReportRbac:
    def test_financial_report_denied_without_permission(self, api_client, plain_user):
        api_client.force_authenticate(user=plain_user)
        resp = api_client.get('/api/reports/financial/')
        assert resp.status_code == 403

    def test_financial_report_allowed_with_view_reports(self, api_client, finance_user):
        api_client.force_authenticate(user=finance_user)
        resp = api_client.get('/api/reports/financial/')
        assert resp.status_code == 200

    def test_students_report_denied_for_candidate_view_own(self, api_client, db):
        """A candidate holding only applications.view_own must not read student reports."""
        user = User.objects.create_user(
            username='cand', email='cand@masterly.test',
            password='testpass123', role='candidate',
        )
        _grant(user, 'applications.view_own')
        api_client.force_authenticate(user=user)
        resp = api_client.get('/api/reports/students/')
        assert resp.status_code == 403

    def test_backup_denied_for_regular_user(self, api_client, plain_user):
        api_client.force_authenticate(user=plain_user)
        resp = api_client.post('/api/system/backup/')
        assert resp.status_code == 403

    def test_backup_allowed_for_settings_manager(self, api_client, db):
        user = User.objects.create_user(
            username='settings_mgr', email='sm@masterly.test',
            password='testpass123', role='system_admin',
        )
        _grant(user, 'settings.manage')
        api_client.force_authenticate(user=user)
        # pg_dump is not available in test env; endpoint will 500, not 403.
        resp = api_client.post('/api/system/backup/')
        assert resp.status_code != 403
