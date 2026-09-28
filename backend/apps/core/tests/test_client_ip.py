"""Tests for the proxy-chain client IP resolver.

The production chain is:

    client -> host nginx -> container nginx -> Django

so REMOTE_ADDR is always the container. These tests pin the two properties that
matter: the real client is recovered, and a forged X-Forwarded-For cannot change
what gets recorded.
"""

from django.test import SimpleTestCase, override_settings

from apps.core import client_ip
from apps.core.client_ip import get_client_ip


def make_request(**meta):
    base = {
        'REMOTE_ADDR': '172.19.0.14',
        'HTTP_X_FORWARDED_FOR': '',
        'HTTP_X_REAL_IP': '',
    }
    base.update(meta)
    return type('FakeRequest', (), {'META': base})()


PROXY_CIDRS = ['172.19.0.0/16', '127.0.0.1/32', '::1/128']


@override_settings(TRUSTED_PROXY_CIDRS=PROXY_CIDRS)
class ClientIpTests(SimpleTestCase):
    def setUp(self):
        client_ip._reset_cache()

    def tearDown(self):
        client_ip._reset_cache()

    def test_production_chain_returns_real_client(self):
        request = make_request(
            HTTP_X_FORWARDED_FOR='203.0.113.9, 172.19.0.1',
            HTTP_X_REAL_IP='172.19.0.1',
        )
        self.assertEqual(get_client_ip(request), '203.0.113.9')

    def test_forged_xff_prefix_is_ignored(self):
        """A client sending its own XFF must not be able to hide its address."""
        request = make_request(
            HTTP_X_FORWARDED_FOR='1.2.3.4, 203.0.113.9, 172.19.0.1',
            HTTP_X_REAL_IP='172.19.0.1',
        )
        self.assertEqual(get_client_ip(request), '203.0.113.9')

    def test_multiple_forged_hops_are_ignored(self):
        request = make_request(
            HTTP_X_FORWARDED_FOR='9.9.9.9, 1.2.3.4, 8.8.8.8, 203.0.113.9, 172.19.0.1',
        )
        self.assertEqual(get_client_ip(request), '203.0.113.9')

    def test_x_real_ip_is_not_trusted(self):
        """A forged X-Real-IP must not decide the recorded address.

        nginx overwrites this header today, but the request itself does not
        guarantee that, so the resolver ignores it entirely.
        """
        request = make_request(
            HTTP_X_REAL_IP='9.9.9.9',
            HTTP_X_FORWARDED_FOR='203.0.113.9, 172.19.0.1',
        )
        self.assertEqual(get_client_ip(request), '203.0.113.9')

    def test_x_real_ip_alone_does_not_win(self):
        request = make_request(
            HTTP_X_REAL_IP='9.9.9.9',
            HTTP_X_FORWARDED_FOR='198.51.100.7, 172.19.0.1',
        )
        self.assertEqual(get_client_ip(request), '198.51.100.7')

    def test_private_lan_client_is_preserved(self):
        """LAN users must keep their private address, not be skipped as 'private'."""
        request = make_request(HTTP_X_FORWARDED_FOR='192.168.1.50, 172.19.0.1')
        self.assertEqual(get_client_ip(request), '192.168.1.50')

    def test_private_lan_client_ignores_forged_header(self):
        request = make_request(HTTP_X_FORWARDED_FOR='10.0.0.1, 192.168.1.50, 172.19.0.1')
        self.assertEqual(get_client_ip(request), '192.168.1.50')

    def test_falls_back_to_remote_addr_when_all_trusted(self):
        request = make_request(HTTP_X_FORWARDED_FOR='172.19.0.1, 172.19.0.14')
        self.assertEqual(get_client_ip(request), '172.19.0.14')

    def test_garbage_headers_are_survivable(self):
        request = make_request(
            HTTP_X_FORWARDED_FOR='not-an-ip, <script>, 203.0.113.9, 172.19.0.1',
        )
        self.assertEqual(get_client_ip(request), '203.0.113.9')

    def test_forged_x_real_ip_cannot_relocate_the_recorded_address(self):
        """Regression: the lockout-bypass shape.

        A client rotating both X-Real-IP and the leading X-Forwarded-For entry
        must always resolve to the same real address, otherwise django-axes
        would hand out a fresh counter per attempt and the brute-force lockout
        would never trigger.
        """
        resolved = set()
        for i in range(1, 7):
            fake = f'10.0.0.{i}'
            resolved.add(get_client_ip(make_request(
                HTTP_X_FORWARDED_FOR=f'{fake}, 203.0.113.9, 172.19.0.1',
                HTTP_X_REAL_IP=fake,
                REMOTE_ADDR='172.19.0.14',
            )))
        self.assertEqual(resolved, {'203.0.113.9'})

    def test_no_headers_at_all(self):
        request = make_request()
        self.assertEqual(get_client_ip(request), '172.19.0.14')

    def test_ipv6_client(self):
        request = make_request(HTTP_X_FORWARDED_FOR='2001:db8::1, 172.19.0.1')
        self.assertEqual(get_client_ip(request), '2001:db8::1')

    def test_ipv6_with_port_is_parsed(self):
        request = make_request(HTTP_X_FORWARDED_FOR='[2001:db8::1]:443, 172.19.0.1')
        self.assertEqual(get_client_ip(request), '2001:db8::1')

    def test_ipv4_with_port_is_parsed(self):
        request = make_request(HTTP_X_FORWARDED_FOR='203.0.113.9:51234, 172.19.0.1')
        self.assertEqual(get_client_ip(request), '203.0.113.9')

    def test_none_request(self):
        self.assertEqual(get_client_ip(None), '')

    def test_is_trusted_proxy(self):
        self.assertTrue(client_ip.is_trusted_proxy('172.19.0.14'))
        self.assertTrue(client_ip.is_trusted_proxy('127.0.0.1'))
        self.assertFalse(client_ip.is_trusted_proxy('203.0.113.9'))
        self.assertFalse(client_ip.is_trusted_proxy('192.168.1.50'))
        self.assertFalse(client_ip.is_trusted_proxy('garbage'))
