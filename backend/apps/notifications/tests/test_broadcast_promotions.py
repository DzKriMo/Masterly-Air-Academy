"""
Regression tests: broadcast notifications can target specific promotion(s),
notifying only active students assigned to those promotions.
"""
import pytest
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

from apps.accounts.models import User as UserModel
from apps.notifications.models import Notification


def _grant(user, codename):
    ct = ContentType.objects.get_for_model(UserModel)
    perm, _ = Permission.objects.get_or_create(
        codename=codename, name=codename, content_type=ct,
    )
    user.user_permissions.add(perm)


@pytest.fixture
def admin_broadcaster(db, user_admin):
    _grant(user_admin, 'notifications.broadcast')
    return user_admin


@pytest.fixture
def admin_client(api_client, admin_broadcaster):
    api_client.force_authenticate(user=admin_broadcaster)
    return api_client


def _student_in_promotion(db, promotion, username, number):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user = User.objects.create_user(
        username=username, email=f'{username}@masterly.test',
        password='testpass123', role='student',
        first_name=username.title(), last_name='Student',
    )
    from apps.students.models import Student
    import datetime
    return Student.objects.create(
        user=user,
        student_number=number,
        first_name=username.title(),
        last_name='Student',
        date_of_birth=datetime.date(2000, 1, 1),
        nationality='US',
        enrollment_date=datetime.date(2025, 9, 1),
        status='active',
        program=promotion.program,
        promotion=promotion,
    )


@pytest.mark.django_db
class TestBroadcastToPromotions:
    def test_sends_to_all_students_in_promotion(self, db, admin_client, promotion):
        s1 = _student_in_promotion(db, promotion, 'stu_one', 'STU-PPL-2025-A-010')
        s2 = _student_in_promotion(db, promotion, 'stu_two', 'STU-PPL-2025-A-011')

        resp = admin_client.post('/api/notifications/broadcast/', {
            'promotion_ids': [str(promotion.id)],
            'title': 'Ground Session',
            'message': 'Class cancelled today',
        }, format='json')

        assert resp.status_code == 200
        assert resp.data['sent'] == 2
        assert Notification.objects.filter(
            user=s1.user, type='broadcast', title='Ground Session'
        ).count() == 1
        assert Notification.objects.filter(
            user=s2.user, type='broadcast', title='Ground Session'
        ).count() == 1

    def test_excludes_students_in_other_promotions(self, db, admin_client, promotion):
        from apps.students.models import Promotion
        import datetime
        other = Promotion.objects.create(
            code='CPL-2025-B', program='CPL', name='CPL 2025 Beta',
            start_date=datetime.date(2025, 9, 1), status='in_progress',
        )
        _student_in_promotion(db, promotion, 'stu_prom_a', 'STU-PPL-2025-A-020')
        outsider = _student_in_promotion(db, other, 'stu_cpl', 'STU-CPL-2025-B-001')

        resp = admin_client.post('/api/notifications/broadcast/', {
            'promotion_ids': [str(promotion.id)],
            'title': 'Targeted',
            'message': 'Only promotion A',
        }, format='json')

        assert resp.status_code == 200
        assert resp.data['sent'] == 1
        assert Notification.objects.filter(user=outsider.user).count() == 0

    def test_supports_comma_separated_promotion_ids(self, db, admin_client, promotion):
        _student_in_promotion(db, promotion, 'stu_csv', 'STU-PPL-2025-A-030')

        resp = admin_client.post('/api/notifications/broadcast/', {
            'promotion_ids': str(promotion.id),
            'title': 'CSV Form',
            'message': 'Hello',
        }, format='json')

        assert resp.status_code == 200
        assert resp.data['sent'] == 1

    def test_unknown_promotion_sends_zero(self, db, admin_client, promotion):
        resp = admin_client.post('/api/notifications/broadcast/', {
            'promotion_ids': ['00000000-0000-0000-0000-000000000000'],
            'title': 'Ghost',
            'message': 'No one home',
        }, format='json')

        assert resp.status_code == 200
        assert resp.data['sent'] == 0

    def test_title_still_required(self, db, admin_client, promotion):
        resp = admin_client.post('/api/notifications/broadcast/', {
            'promotion_ids': [str(promotion.id)],
            'message': 'No title',
        }, format='json')

        assert resp.status_code == 400
