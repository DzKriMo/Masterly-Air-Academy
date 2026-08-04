"""Tests for Flight Exercise Bank CRUD and evaluation integration."""
import pytest


@pytest.fixture
def exercise_maneuver(db):
    from apps.flight_training.models import FlightExercise
    return FlightExercise.objects.create(
        code='EX-TKF', title='Takeoff', category='maneuver',
        order=1, is_active=True,
    )


@pytest.fixture
def exercise_emergency(db):
    from apps.flight_training.models import FlightExercise
    return FlightExercise.objects.create(
        code='EX-STL2', title='Stall Recovery', category='emergency',
        order=2, is_active=True,
    )


@pytest.fixture
def exercise_inactive(db):
    from apps.flight_training.models import FlightExercise
    return FlightExercise.objects.create(
        code='EX-OLD', title='Old Exercise', category='other',
        order=99, is_active=False,
    )


@pytest.fixture
def flight_lesson(db, student_profile, flight_instructor_profile, aircraft):
    from apps.flight_training.models import FlightLesson, FlightStatus
    return FlightLesson.objects.create(
        student=student_profile, instructor=flight_instructor_profile,
        aircraft=aircraft, scheduled_date='2026-01-15',
        status=FlightStatus.SCHEDULED,
    )


class TestFlightExerciseCRUD:

    def test_list_exercises_admin(self, auth_client, exercise_maneuver, exercise_emergency, exercise_inactive):
        resp = auth_client.get('/api/flight-exercises/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 3

    def test_list_active_only(self, auth_client, exercise_maneuver, exercise_emergency, exercise_inactive):
        resp = auth_client.get('/api/flight-exercises/?is_active=true')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 2

    def test_filter_by_category(self, auth_client, exercise_maneuver, exercise_emergency):
        resp = auth_client.get('/api/flight-exercises/?category=emergency')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 1
        assert resp.data['results'][0]['code'] == 'EX-STL2'

    def test_create_exercise(self, auth_client):
        resp = auth_client.post('/api/flight-exercises/', {
            'code': 'EX-NEW', 'title': 'New Exercise',
            'category': 'maneuver', 'is_active': True, 'order': 5,
        }, format='json')
        assert resp.status_code == 201
        assert resp.data['code'] == 'EX-NEW'

    def test_update_exercise(self, auth_client, exercise_maneuver):
        resp = auth_client.patch(f'/api/flight-exercises/{exercise_maneuver.id}/', {
            'title': 'Takeoff Updated',
        }, format='json')
        assert resp.status_code == 200
        assert resp.data['title'] == 'Takeoff Updated'

    def test_delete_exercise(self, auth_client, exercise_maneuver):
        resp = auth_client.delete(f'/api/flight-exercises/{exercise_maneuver.id}/')
        assert resp.status_code == 204
        from apps.flight_training.models import FlightExercise
        assert not FlightExercise.objects.filter(id=exercise_maneuver.id).exists()

    def test_student_cannot_create_exercise(self, db, student_profile):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        from django.contrib.auth import get_user_model
        User = get_user_model()
        student_user = User.objects.create_user(
            username='stu_test', email='stu@test.com',
            password='testpass', role='student',
        )
        refresh = RefreshToken.for_user(student_user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        resp = client.post('/api/flight-exercises/', {
            'code': 'EX-X', 'title': 'X', 'category': 'other',
        }, format='json')
        assert resp.status_code == 403


class TestExerciseInEvaluation:

    def test_evaluate_with_exercises(self, auth_client, flight_lesson):
        resp = auth_client.post(
            f'/api/flight-lessons/{flight_lesson.id}/evaluate/',
            {
                'flight_duration': 1.5,
                'exercises_completed': ['Takeoff', 'Landing', 'Custom Exercise'],
                'competencies_acquired': ['Radio communication'],
                'grade': 8.5,
                'result': 'passed',
            },
            format='json',
        )
        assert resp.status_code == 200
        assert resp.data['exercises_completed'] == ['Takeoff', 'Landing', 'Custom Exercise']
        assert resp.data['competencies_acquired'] == ['Radio communication']
        assert resp.data['grade'] == '8.5'
        assert resp.data['status'] == 'completed'


class TestSkillTestExercises:

    def test_complete_skill_test_with_exercises(self, auth_client, student_profile, flight_instructor_profile):
        from apps.exams.models import SkillTest
        from django.utils import timezone
        st = SkillTest.objects.create(
            student=student_profile, examiner=flight_instructor_profile,
            scheduled_date=timezone.now(), status='authorized',
        )
        resp = auth_client.post(f'/api/skill-tests/{st.id}/complete/', {
            'result': 'passed',
            'exercises': ['Takeoff', 'Landing', 'Emergency procedures'],
        }, format='json')
        assert resp.status_code == 200
        assert resp.data['exercises'] == ['Takeoff', 'Landing', 'Emergency procedures']
        assert resp.data['status'] == 'completed'
