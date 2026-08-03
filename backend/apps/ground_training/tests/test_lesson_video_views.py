"""Tests for lesson video upload, view tracking, and tab-switch detection."""
import pytest

from apps.ground_training.models import Module, ModuleLesson, LessonVideoView


@pytest.fixture
def student_ground_user(student_profile):
    """Give the default student user the same ground_training.view permission
    they hold in production."""
    from django.contrib.auth.models import Permission
    from django.contrib.contenttypes.models import ContentType
    from apps.accounts.models import User
    ct = ContentType.objects.get_for_model(User)
    perm, _ = Permission.objects.get_or_create(
        codename='ground_training.view', name='Ground training view', content_type=ct,
    )
    student_profile.user.user_permissions.add(perm)
    return student_profile.user


@pytest.fixture
def module(db, subject):
    return Module.objects.create(
        subject=subject,
        title='Module 1',
        duration=2,
        order=1,
    )


@pytest.fixture
def mandatory_lesson(db, module):
    return ModuleLesson.objects.create(
        module=module,
        lesson_no=1,
        title='Lesson one',
        content='Some markdown',
        video_url='module_videos/abc/video.mp4',
        is_mandatory=True,
    )


class TestLessonVideoTracking:
    def test_track_view_creates_and_increments_watched(self, api_client, student_ground_user, student_profile, mandatory_lesson):
        api_client.force_authenticate(user=student_ground_user)
        resp = api_client.post(
            f'/api/module-lessons/{mandatory_lesson.id}/track_view/',
            {'position': 30, 'duration': 100},
            format='json',
        )
        assert resp.status_code == 200, resp.content
        data = resp.json()
        assert data['is_mandatory'] is True
        assert data['tracking'] is True
        assert data['duration'] == 100
        assert data['watched_seconds'] == 30

        # Second heartbeat adds more watched time.
        resp2 = api_client.post(
            f'/api/module-lessons/{mandatory_lesson.id}/track_view/',
            {'position': 60, 'duration': 100},
            format='json',
        )
        assert resp2.status_code == 200
        assert resp2.json()['watched_seconds'] == 60

    def test_track_view_marks_completed_at_threshold(self, api_client, student_ground_user, student_profile, mandatory_lesson):
        api_client.force_authenticate(user=student_ground_user)
        resp = api_client.post(
            f'/api/module-lessons/{mandatory_lesson.id}/track_view/',
            {'position': 95, 'duration': 100},
            format='json',
        )
        assert resp.status_code == 200
        assert resp.json()['status'] == 'completed'

    def test_track_view_records_and_stacks_tab_switches(self, api_client, student_ground_user, student_profile, mandatory_lesson):
        api_client.force_authenticate(user=student_ground_user)
        api_client.post(
            f'/api/module-lessons/{mandatory_lesson.id}/track_view/',
            {'position': 10, 'duration': 100, 'tab_switches': 1},
            format='json',
        )
        api_client.post(
            f'/api/module-lessons/{mandatory_lesson.id}/track_view/',
            {'position': 12, 'duration': 100, 'tab_switches': 2},
            format='json',
        )
        view = LessonVideoView.objects.get(lesson=mandatory_lesson, student=student_profile)
        assert view.tab_switches == 3

    def test_student_without_profile_cannot_track(self, api_client, user_admin, mandatory_lesson):
        api_client.force_authenticate(user=user_admin)
        resp = api_client.post(
            f'/api/module-lessons/{mandatory_lesson.id}/track_view/',
            {'position': 10, 'duration': 100},
            format='json',
        )
        assert resp.status_code == 404

    def test_lesson_serializer_exposes_progress_to_student(self, api_client, student_ground_user, student_profile, mandatory_lesson):
        api_client.force_authenticate(user=student_ground_user)
        api_client.post(
            f'/api/module-lessons/{mandatory_lesson.id}/track_view/',
            {'position': 40, 'duration': 100},
            format='json',
        )
        resp = api_client.get(f'/api/module-lessons/{mandatory_lesson.id}/')
        assert resp.status_code == 200
        data = resp.json().get('data', resp.json())
        assert data['is_mandatory'] is True
        assert data['has_video'] is True
        assert data['video_watched_seconds'] == 40
        assert data['video_status'] == 'in_progress'

    def test_video_stream_requires_auth_without_token(self, api_client, mandatory_lesson):
        resp = api_client.get(f'/api/module-lessons/{mandatory_lesson.id}/video/')
        assert resp.status_code in (401, 403)

    def test_video_stream_accepts_query_token(self, api_client, student_ground_user, mandatory_lesson):
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(student_ground_user).access_token)
        resp = api_client.get(
            f'/api/module-lessons/{mandatory_lesson.id}/video/?token={token}',
        )
        # The fixture video key does not exist in storage, so the endpoint
        # returns 404, but it must NOT be an auth failure.
        assert resp.status_code == 404, resp.content