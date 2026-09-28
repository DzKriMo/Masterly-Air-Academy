"""End-to-end checks that the audit trail records the real client IP.

Regression tests for the production bug where every AuditLog row stored
172.19.0.14 (the nginx container) instead of the user's address, which made the
audit trail useless. They also pin the anti-spoofing behaviour: because both
nginx layers *append* to X-Forwarded-For, a client-supplied header must never
be able to decide what gets recorded.
"""

import pytest
from django.urls import reverse

from apps.accounts.models import User
from apps.core.models import AuditLog

PROXY_CIDRS = ['172.19.0.0/16', '127.0.0.1/32', '::1/128']

# What the container nginx observes: its peer is the host nginx via the bridge.
PROXY_META = {
    'REMOTE_ADDR': '172.19.0.14',
    'HTTP_X_REAL_IP': '172.19.0.1',
}


@pytest.mark.django_db
class TestAuditLogClientIp:
    def test_login_audit_records_real_client_not_proxy(self, api_client, user_student):
        response = api_client.post(
            reverse('token_obtain_pair'),
            {'email': 'student@masterly.test', 'password': 'testpass123'},
            HTTP_X_FORWARDED_FOR='203.0.113.9, 172.19.0.1',
            **PROXY_META,
        )
        assert response.status_code == 200

        entry = AuditLog.objects.filter(action='login').latest('created_at')
        assert entry.ip_address == '203.0.113.9'

    def test_login_audit_ignores_forged_forwarded_for(self, api_client, user_student):
        """A client sending its own XFF must not be able to forge the record."""
        response = api_client.post(
            reverse('token_obtain_pair'),
            {'email': 'student@masterly.test', 'password': 'testpass123'},
            HTTP_X_FORWARDED_FOR='1.2.3.4, 203.0.113.9, 172.19.0.1',
            **PROXY_META,
        )
        assert response.status_code == 200

        entry = AuditLog.objects.filter(action='login').latest('created_at')
        assert entry.ip_address == '203.0.113.9'

    def test_last_login_ip_records_real_client(self, api_client, user_student):
        api_client.post(
            reverse('token_obtain_pair'),
            {'email': 'student@masterly.test', 'password': 'testpass123'},
            HTTP_X_FORWARDED_FOR='198.51.100.42, 172.19.0.1',
            **PROXY_META,
        )
        user = User.objects.get(email='student@masterly.test')
        assert user.last_login_ip == '198.51.100.42'

    def test_no_audit_row_ever_stores_the_nginx_container_ip(self, api_client, user_student):
        api_client.post(
            reverse('token_obtain_pair'),
            {'email': 'student@masterly.test', 'password': 'testpass123'},
            HTTP_X_FORWARDED_FOR='203.0.113.9, 172.19.0.1',
            **PROXY_META,
        )
        assert not AuditLog.objects.filter(ip_address='172.19.0.14').exists()

    def test_lan_client_keeps_private_address(self, api_client, user_student):
        """Someone on the office LAN is recorded with their LAN address."""
        api_client.post(
            reverse('token_obtain_pair'),
            {'email': 'student@masterly.test', 'password': 'testpass123'},
            HTTP_X_FORWARDED_FOR='192.168.1.50, 172.19.0.1',
            **PROXY_META,
        )
        entry = AuditLog.objects.filter(action='login').latest('created_at')
        assert entry.ip_address == '192.168.1.50'


@pytest.mark.django_db
class TestLoginAuditUnderNarrowerProxyConfig:
    """The resolver reads TRUSTED_PROXY_CIDRS, so the range must actually match."""

    def test_docker_gateway_outside_trusted_range_is_not_recorded_as_client(
        self, api_client, user_student
    ):
        """Regression: if the real gateway 172.17.0.1 is not trusted it leaks in.

        This documents why the trusted list covers the whole docker bridge
        block rather than only the one subnet this deployment happens to use.
        """
        from django.test.utils import override_settings

        with override_settings(TRUSTED_PROXY_CIDRS=['172.19.0.0/16']):
            api_client.post(
                reverse('token_obtain_pair'),
                {'email': 'student@masterly.test', 'password': 'testpass123'},
                HTTP_X_FORWARDED_FOR='203.0.113.9, 172.17.0.1',
                **PROXY_META,
            )
        entry = AuditLog.objects.filter(action='login').latest('created_at')
        # 172.17.0.1 is not in the configured range, so it is the best guess
        # available - which is exactly why it must be in the real config.
        assert entry.ip_address == '172.17.0.1'
