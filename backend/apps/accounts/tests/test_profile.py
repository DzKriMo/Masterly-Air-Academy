"""
Tests for the profile photo flow.

Production serves media over an authenticated streaming endpoint
(``/api/profile/photo/``) because DEBUG=False disables Django's static media
route and files live in the default (MinIO) storage backend.
"""
import io

import pytest
from django.core.files.images import ImageFile
from django.core.files.storage import default_storage
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

# Minimal valid 1x1 PNG
PNG_BYTES = bytes.fromhex(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
    '0000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082'
)


@pytest.fixture
def student_auth_client(user_student):
    """APIClient pre-authenticated as the default student."""
    client = APIClient()
    refresh = RefreshToken.for_user(user_student)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


@pytest.mark.django_db
class TestProfilePhoto:
    def test_profile_photo_stream_returns_image(self, student_profile, student_auth_client):
        """A student with a stored photo receives it as an image response."""
        key = default_storage.save(
            'students/photos/test_photo.png',
            ImageFile(io.BytesIO(PNG_BYTES), name='test_photo.png'),
        )
        student_profile.photo = key
        student_profile.save(update_fields=['photo'])

        response = student_auth_client.get(reverse('profile-photo'))

        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'].startswith('image/png')
        assert response.getvalue() == PNG_BYTES

    def test_profile_photo_404_when_none(self, student_profile, student_auth_client):
        """A student without a photo gets 404 rather than a broken image."""
        response = student_auth_client.get(reverse('profile-photo'))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_profile_photo_requires_auth(self, student_profile, api_client):
        """The photo endpoint requires an authenticated session."""
        response = api_client.get(reverse('profile-photo'))
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
