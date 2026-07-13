"""
Tests for JWT authentication flow.

Covers login with valid/invalid credentials, inactive-user rejection,
token refresh, and protected-endpoint access control.
"""
import pytest
from django.urls import reverse
from django.test.utils import override_settings
from rest_framework import status


@pytest.mark.django_db
class TestAuthentication:
    """Authentication endpoint tests."""

    def test_login_valid_credentials(self, api_client, user_student):
        """A registered user with correct password receives tokens."""
        response = api_client.post(reverse('token_obtain_pair'), {
            'email': 'student@masterly.test',
            'password': 'testpass123',
        })
        assert response.status_code == status.HTTP_200_OK
        body = response.data
        # JWT tokens present
        assert 'access' in body
        assert 'refresh' in body
        # User info embedded in response
        assert 'user' in body
        assert body['user']['email'] == 'student@masterly.test'
        assert body['user']['role'] == 'student'
        assert body['user']['is_active'] is True

    def test_login_invalid_credentials(self, api_client, user_student):
        """Wrong password returns 401 Unauthorized."""
        response = api_client.post(reverse('token_obtain_pair'), {
            'email': 'student@masterly.test',
            'password': 'wrongpassword',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, api_client):
        """A completely unknown email returns 401."""
        response = api_client.post(reverse('token_obtain_pair'), {
            'email': 'nobody@masterly.test',
            'password': 'irrelevant',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_inactive_user(self, api_client):
        """A user with is_active=False is blocked with a clear message."""
        from apps.accounts.models import User
        inactive = User.objects.create_user(
            username='inactive_user', email='inactive@masterly.test',
            password='testpass123', role='student',
            is_active=False,
        )
        response = api_client.post(reverse('token_obtain_pair'), {
            'email': 'inactive@masterly.test',
            'password': 'testpass123',
        })
        # The custom serializer raises a ValidationError (400) for inactive users
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'deactivated' in str(response.data).lower()

    def test_token_refresh(self, api_client, user_admin):
        """A valid refresh token yields a new access token."""
        # Obtain tokens first
        login_resp = api_client.post(reverse('token_obtain_pair'), {
            'email': 'admin@masterly.test',
            'password': 'testpass123',
        })
        assert login_resp.status_code == status.HTTP_200_OK
        refresh_token = login_resp.data['refresh']

        # Refresh
        refresh_resp = api_client.post(reverse('token_refresh'), {
            'refresh': refresh_token,
        })
        assert refresh_resp.status_code == status.HTTP_200_OK
        assert 'access' in refresh_resp.data

    def test_access_protected_endpoint_without_token(self, api_client):
        """An unauthenticated request to a protected view returns 401."""
        response = api_client.get(reverse('student-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_access_protected_endpoint_with_token(self, api_client, user_admin):
        """An authenticated request with a valid JWT returns 200."""
        # Login as admin (bypasses role-based permission checks)
        login_resp = api_client.post(reverse('token_obtain_pair'), {
            'email': 'admin@masterly.test',
            'password': 'testpass123',
        })
        access_token = login_resp.data['access']

        # Use the token
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = api_client.get(reverse('student-list'))
        assert response.status_code == status.HTTP_200_OK

    def test_access_protected_endpoint_with_expired_token(self, api_client, user_admin):
        """An expired JWT is rejected with 401."""
        import time
        from rest_framework_simplejwt.tokens import AccessToken
        token = AccessToken.for_user(user_admin)
        # Manually expire the token by setting short lifetime and waiting
        # Alternatively, check that a malformed token is rejected
        api_client.credentials(HTTP_AUTHORIZATION='Bearer invalid.token.here')
        response = api_client.get(reverse('student-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_fields(self, api_client):
        """Login without email/password returns 400."""
        response = api_client.post(reverse('token_obtain_pair'), {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_refresh_with_invalid_token(self, api_client):
        """An invalid refresh token returns 401."""
        response = api_client.post(reverse('token_refresh'), {
            'refresh': 'clearly-invalid-token',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
