"""Tests for the landing page content API (social manager portal + public page).

Covers RBAC on the management viewset, the draft/publish/rollback lifecycle,
the unauthenticated public landing endpoint, and the public media stream.
"""
import pytest
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.urls import reverse
from rest_framework import status


@pytest.fixture
def social_manager_user(db):
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import Permission
    from django.contrib.contenttypes.models import ContentType
    User = get_user_model()
    user = User.objects.create_user(
        username='social', email='social@masterly.test',
        password='testpass123', role='social_manager',
        first_name='Social', last_name='Manager',
    )
    ct = ContentType.objects.get_for_model(User)
    for codename in ('landing.view', 'landing.manage', 'landing.publish'):
        perm, _ = Permission.objects.get_or_create(
            codename=codename, name=f'Landing {codename}', content_type=ct,
        )
        user.user_permissions.add(perm)
    return user


@pytest.fixture
def social_client(social_manager_user):
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken
    client = APIClient()
    refresh = RefreshToken.for_user(social_manager_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


@pytest.fixture
def outsider_user(db):
    """A logged-in user with no landing permissions."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(
        username='ground', email='ground@masterly.test',
        password='testpass123', role='ground_instructor',
    )


@pytest.fixture
def outsider_client(outsider_user):
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken
    client = APIClient()
    refresh = RefreshToken.for_user(outsider_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


def make_section(**overrides):
    from apps.landing.models import LandingSection
    data = {
        'key': 'hero',
        'title': 'Hero',
        'content': [{'type': 'hero', 'data': {'title': 'Draft title'}}],
    }
    data.update(overrides)
    return LandingSection.objects.create(**data)


class TestLandingRBAC:
    def test_outsider_cannot_list_sections(self, outsider_client):
        resp = outsider_client.get(reverse('landing-section-list'))
        assert resp.status_code in (401, 403)

    def test_social_manager_can_list_sections(self, social_client):
        make_section()
        resp = social_client.get(reverse('landing-section-list'))
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data['results']) == 1

    def test_social_manager_can_create_section(self, social_client):
        resp = social_client.post(reverse('landing-section-list'), {
            'key': 'gallery',
            'title': 'Gallery',
            'content': [{'type': 'gallery', 'data': {'items': []}}],
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED

    def test_invalid_block_type_rejected(self, social_client):
        resp = social_client.post(reverse('landing-section-list'), {
            'key': 'bad',
            'title': 'Bad',
            'content': [{'type': 'script', 'data': {}}],
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


class TestLandingLifecycle:
    def test_publish_snapshots_content_and_bumps_version(self, social_client):
        section = make_section()
        assert section.status == 'draft'
        resp = social_client.post(reverse('landing-section-publish', kwargs={'pk': section.pk}))
        assert resp.status_code == status.HTTP_200_OK
        section.refresh_from_db()
        assert section.status == 'published'
        assert section.published_version == 1
        assert section.published_content == section.content

    def test_rollback_restores_draft_from_published(self, social_client):
        section = make_section(
            status='published',
            published_version=1,
            published_content=[{'type': 'hero', 'data': {'title': 'Live title'}}],
            content=[{'type': 'hero', 'data': {'title': 'Broken draft'}}],
        )
        resp = social_client.post(reverse('landing-section-rollback', kwargs={'pk': section.pk}))
        assert resp.status_code == status.HTTP_200_OK
        section.refresh_from_db()
        assert section.content[0]['data']['title'] == 'Live title'

    def test_rollback_without_published_returns_400(self, social_client):
        section = make_section()
        resp = social_client.post(reverse('landing-section-rollback', kwargs={'pk': section.pk}))
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


class TestPublicLanding:
    def test_public_endpoint_needs_no_auth(self, db, api_client):
        resp = api_client.get(reverse('public-landing'))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == []

    def test_public_returns_published_only(self, db, api_client):
        published = make_section(
            key='hero', status='published', published_version=1,
            published_content=[{'type': 'hero', 'data': {'title': 'Live'}}],
        )
        make_section(key='about', title='About')  # still draft
        resp = api_client.get(reverse('public-landing'))
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]['key'] == 'hero'
        assert resp.data[0]['content'][0]['data']['title'] == 'Live'


class TestSeededRole:
    def test_seed_command_grants_landing_to_social_manager(self, db):
        from django.core.management import call_command
        from django.contrib.auth.models import Group
        call_command('seed_roles_permissions', verbosity=0)
        group = Group.objects.get(name='social_manager')
        perms = set(group.permissions.values_list('codename', flat=True))
        assert 'landing.manage' in perms
        assert 'landing.publish' in perms


class TestSeedLandingSections:
    def test_creates_all_sections_as_drafts(self, db):
        from django.core.management import call_command
        from apps.landing.models import LandingSection
        call_command('seed_landing_sections', verbosity=0)
        assert LandingSection.objects.count() == 8
        hero = LandingSection.objects.get(key='hero')
        assert hero.status == 'draft'
        assert hero.content[0]['type'] == 'hero'
        assert hero.content[0]['data']['title']['en']  # localized content
        assert hero.content[0]['data']['title']['ar']
        assert hero.content[0]['data']['title']['fr']
        assert LandingSection.objects.get(key='accreditations').content[0]['data']['items'][0]['key'] == '/images/1.webp'

    def test_idempotent_and_preserves_existing_content(self, db):
        from django.core.management import call_command
        from apps.landing.models import LandingSection
        call_command('seed_landing_sections', verbosity=0)
        hero = LandingSection.objects.get(key='hero')
        hero.content = [{'type': 'hero', 'data': {'title': {'en': 'Customized', 'fr': '', 'ar': ''}}}]
        hero.save()
        call_command('seed_landing_sections', verbosity=0)
        hero.refresh_from_db()
        assert hero.content[0]['data']['title']['en'] == 'Customized'
        assert LandingSection.objects.count() == 8

    def test_empty_section_is_filled_on_rerun(self, db):
        from django.core.management import call_command
        from apps.landing.models import LandingSection
        call_command('seed_landing_sections', verbosity=0)
        programs = LandingSection.objects.get(key='programs')
        programs.content = []
        programs.save()
        call_command('seed_landing_sections', verbosity=0)
        programs.refresh_from_db()
        assert programs.content[0]['type'] == 'programs'


class TestPublicMediaStream:
    def test_streams_published_media_publicly(self, db, api_client):
        key = default_storage.save('landing/photo.png', ContentFile(b'fake-png-bytes'))
        from apps.landing.models import LandingMedia
        LandingMedia.objects.create(name='Photo', file_key=key, mime_type='image/png', file_size=14)
        resp = api_client.get(reverse('public-landing-media', kwargs={'key': key}))
        assert resp.status_code == status.HTTP_200_OK
        assert resp['Content-Type'].startswith('image/png')
        assert b'png' in resp.getvalue()

    def test_rejects_keys_outside_landing_prefix(self, api_client):
        default_storage.save('library/secret.pdf', ContentFile(b'%PDF'))
        resp = api_client.get(reverse('public-landing-media', kwargs={'key': 'library/secret.pdf'}))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_missing_file_returns_404(self, api_client):
        resp = api_client.get(reverse('public-landing-media', kwargs={'key': 'landing/nope.png'}))
        assert resp.status_code == status.HTTP_404_NOT_FOUND
