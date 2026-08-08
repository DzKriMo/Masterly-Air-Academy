"""
Tests for httpOnly-cookie JWT authentication.

Covers: login plants the auth cookies, cookie-authenticated access to protected
endpoints, CSRF enforcement on state-changing cookie-authenticated requests,
cookie-based token rotation (old refresh gets blacklisted), and logout clearing
the cookies. Header-based auth is exercised by the existing test_auth.py suite.

Clients use ``enforce_csrf_checks=True`` so that ``CookieJWTAuthentication``'s
CSRF check behaves like a real browser (the default test client opts out).
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.cookie_auth import ACCESS_COOKIE, REFRESH_COOKIE

LOGIN_URL = reverse('token_obtain_pair')
REFRESH_URL = reverse('token_refresh')
ME_URL = reverse('me')
LOGOUT_URL = reverse('logout')


def _client():
    return APIClient(enforce_csrf_checks=True)


def _login(client, email='admin@masterly.test', password='testpass123'):
    """POST /api/login/ and assert the auth cookies were planted."""
    response = client.post(LOGIN_URL, {'email': email, 'password': password})
    assert response.status_code == status.HTTP_200_OK
    assert ACCESS_COOKIE in client.cookies
    assert REFRESH_COOKIE in client.cookies
    # ensure_csrf_cookie sets the csrftoken cookie for the SPA
    assert 'csrftoken' in client.cookies
    return response


def _csrf_header(client):
    return {'HTTP_X_CSRFTOKEN': client.cookies['csrftoken'].value}


def _cookie_cleared(client, name):
    """The cookie entry stays in the jar but is empty (deleted)."""
    return name in client.cookies and client.cookies[name].value == ''


@pytest.mark.django_db
class TestCookieAuth:
    def test_login_sets_httponly_cookies(self, user_admin):
        client = _client()
        response = _login(client)
        access_cookie = client.cookies[ACCESS_COOKIE]
        refresh_cookie = client.cookies[REFRESH_COOKIE]
        assert access_cookie.get('httponly') is True
        assert refresh_cookie.get('httponly') is True
        # Tokens remain in the body for header-based clients
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_me_works_with_cookie(self, user_admin):
        client = _client()
        _login(client)
        response = client.get(ME_URL)
        assert response.status_code == status.HTTP_200_OK
        # The view returns bare data (the renderer wraps it exactly once), so
        # there must be no nested {success, data} layer to double-wrap.
        data = response.data
        assert isinstance(data, dict)
        assert 'success' not in data
        assert data['email'] == 'admin@masterly.test'
        assert data['role'] == 'system_admin'
        assert 'permissions' in data

    def test_me_without_cookie_returns_401(self):
        client = _client()
        response = client.get(ME_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cookie_auth_requires_csrf_on_post(self, user_admin):
        client = _client()
        _login(client)
        # State-changing request authenticated via cookie but no CSRF token -> 403
        response = client.post(LOGOUT_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        # With a valid X-CSRFToken it succeeds and clears the cookies
        response = client.post(LOGOUT_URL, **_csrf_header(client))
        assert response.status_code == status.HTTP_200_OK
        assert _cookie_cleared(client, ACCESS_COOKIE)
        assert _cookie_cleared(client, REFRESH_COOKIE)

    def test_me_after_logout_returns_401(self, user_admin):
        client = _client()
        _login(client)
        response = client.post(LOGOUT_URL, **_csrf_header(client))
        assert response.status_code == status.HTTP_200_OK
        assert _cookie_cleared(client, ACCESS_COOKIE)
        response = client.get(ME_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_rotates_cookie_and_blacklists_old(self, user_admin):
        client = _client()
        _login(client)
        old_refresh = client.cookies[REFRESH_COOKIE].value

        # Refresh via the cookie (no body needed); valid access cookie -> CSRF
        response = client.post(REFRESH_URL, **_csrf_header(client))
        assert response.status_code == status.HTTP_200_OK
        new_refresh = client.cookies[REFRESH_COOKIE].value
        assert new_refresh and new_refresh != old_refresh

        # The pre-rotation refresh token is now blacklisted
        stale_client = APIClient()
        response = stale_client.post(REFRESH_URL, {'refresh': old_refresh})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_works_with_expired_access_cookie(self, user_admin):
        """When the access cookie is expired, the refresh POST needs no CSRF
        (no cookie-based auth succeeds), matching the real SPA recovery flow."""
        from rest_framework_simplejwt.tokens import RefreshToken as SRefreshToken
        from apps.accounts.cookie_auth import set_auth_cookies
        from rest_framework.response import Response
        from django.test import RequestFactory

        client = _client()
        login = _login(client)
        old_refresh = client.cookies[REFRESH_COOKIE].value

        # Overwrite the access cookie with an already-expired token
        expired = SRefreshToken.for_user(user_admin).access_token
        expired.set_exp(0)
        resp = Response()
        set_auth_cookies(resp, access=str(expired), refresh=old_refresh)
        for name, morsel in resp.cookies.items():
            client.cookies[name] = morsel

        # No csrftoken cookie sent -> enforce_csrf cannot match -> but since the
        # access cookie is expired, no auth succeeds and no CSRF is enforced.
        response = client.post(REFRESH_URL)
        assert response.status_code == status.HTTP_200_OK
        assert client.cookies[REFRESH_COOKIE].value != old_refresh

    def test_header_auth_still_works_without_cookies(self, user_admin):
        """Existing header-based API clients remain functional (no cookies)."""
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user_admin)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        response = client.get(ME_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_logout_revokes_all_outstanding_refresh_tokens(self, user_admin):
        """Logout must revoke every outstanding refresh token for the user, not
        just the one currently in the cookie. A sibling tab may hold a rotated
        token that would otherwise resurrect the session after logout."""
        client = _client()
        _login(client)
        first_refresh = client.cookies[REFRESH_COOKIE].value

        # Rotate once so a second valid refresh token exists for the user
        response = client.post(REFRESH_URL, **_csrf_header(client))
        assert response.status_code == status.HTTP_200_OK
        second_refresh = client.cookies[REFRESH_COOKIE].value
        assert second_refresh and second_refresh != first_refresh

        response = client.post(LOGOUT_URL, **_csrf_header(client))
        assert response.status_code == status.HTTP_200_OK
        assert _cookie_cleared(client, ACCESS_COOKIE)
        assert _cookie_cleared(client, REFRESH_COOKIE)

        user_admin.refresh_from_db()
        assert user_admin.last_logout_at is not None

        # Neither the pre-logout token nor the rotated one can be reused
        for token in (first_refresh, second_refresh):
            stale = APIClient()
            resp = stale.post(REFRESH_URL, {'refresh': token})
            assert resp.status_code == status.HTTP_401_UNAUTHORIZED, token

    def test_refresh_rejected_for_token_issued_before_logout(self, user_admin):
        """A refresh token issued before the logout stays dead even if it
        escaped the blacklist sweep (simulates the multi-tab rotation race)."""
        from django.utils import timezone as dj_tz
        client = _client()
        _login(client)
        pre_logout_refresh = client.cookies[REFRESH_COOKIE].value

        # Simulate the race: the token was never blacklisted, but the user
        # logged out after the token was issued.
        user_admin.last_logout_at = dj_tz.now()
        user_admin.save(update_fields=['last_logout_at'])

        stale = APIClient()
        resp = stale.post(REFRESH_URL, {'refresh': pre_logout_refresh})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_relogin_after_logout_issues_working_tokens(self, user_admin):
        """A fresh login after logout issues tokens newer than last_logout_at,
        so refresh and /me/ keep working."""
        client = _client()
        _login(client)
        response = client.post(LOGOUT_URL, **_csrf_header(client))
        assert response.status_code == status.HTTP_200_OK

        fresh = _client()
        _login(fresh)
        response = fresh.post(REFRESH_URL, **_csrf_header(fresh))
        assert response.status_code == status.HTTP_200_OK
        response = fresh.get(ME_URL)
        assert response.status_code == status.HTTP_200_OK
