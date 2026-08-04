"""
Tests for the role-permission resolver, specifically that `manage` in a domain
satisfies any required permission in that domain (e.g. training_admin holding
ground_training.manage can access the ground-evaluations endpoint which requires
ground_training.evaluate).
"""
import pytest
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory

from apps.accounts.models import User
from apps.accounts.permissions import HasRolePermission


@pytest.fixture
def make_perm(db):
    def _make(codename):
        ct, _ = ContentType.objects.get_or_create(
            app_label='accounts', model='custompermission',
        )
        return Permission.objects.get_or_create(
            codename=codename,
            defaults={'name': codename, 'content_type': ct},
        )[0]
    return _make


@pytest.mark.django_db
def test_manage_implies_evaluate_permission(make_perm):
    """A user holding <domain>.manage passes a <domain>.evaluate requirement."""
    group = Group.objects.create(name='training_admin')
    group.permissions.set([make_perm('ground_training.manage')])

    user = User.objects.create_user(
        username='ta_user', email='ta@masterly.test',
        password='testpass123', role='training_admin',
        first_name='TA', last_name='User',
    )
    user.groups.add(group)

    factory = APIRequestFactory()
    request = factory.get('/api/ground-evaluations/')
    request.user = user

    class FakeView:
        action = 'list'
        required_permission = 'ground_training.evaluate'

    assert HasRolePermission().has_permission(request, FakeView()) is True


@pytest.mark.django_db
def test_manage_implies_evaluate_write_action(make_perm):
    """A manage holder can also create in a domain whose view requires evaluate."""
    group = Group.objects.create(name='training_admin')
    group.permissions.set([make_perm('ground_training.manage')])

    user = User.objects.create_user(
        username='ta_user2', email='ta2@masterly.test',
        password='testpass123', role='training_admin',
        first_name='TA', last_name='Two',
    )
    user.groups.add(group)

    factory = APIRequestFactory()
    request = factory.post('/api/ground-evaluations/', {})
    request.user = user

    class FakeView:
        action = 'create'
        required_permission = 'ground_training.evaluate'

    assert HasRolePermission().has_permission(request, FakeView()) is True


@pytest.mark.django_db
def test_view_only_does_not_imply_evaluate(make_perm):
    """A user with only ground_training.view still fails an evaluate requirement."""
    group = Group.objects.create(name='reader')
    group.permissions.set([make_perm('ground_training.view')])

    user = User.objects.create_user(
        username='reader_user', email='reader@masterly.test',
        password='testpass123', role='student',
        first_name='R', last_name='Reader',
    )
    user.groups.add(group)

    factory = APIRequestFactory()
    request = factory.get('/api/ground-evaluations/')
    request.user = user

    class FakeView:
        action = 'list'
        required_permission = 'ground_training.evaluate'

    assert HasRolePermission().has_permission(request, FakeView()) is False


@pytest.mark.django_db
def test_ground_training_create_allows_create_action(make_perm):
    """A ground instructor holding ground_training.create can create courses
    (create action on a ground_training.view-required endpoint)."""
    group = Group.objects.create(name='ground_instructor')
    group.permissions.set([make_perm('ground_training.view_own'),
                           make_perm('ground_training.create'),
                           make_perm('ground_training.update')])

    user = User.objects.create_user(
        username='gi_user', email='gi@masterly.test',
        password='testpass123', role='ground_instructor',
        first_name='GI', last_name='User',
    )
    user.groups.add(group)

    factory = APIRequestFactory()
    request = factory.post('/api/courses/', {})
    request.user = user

    class FakeView:
        action = 'create'
        required_permission = 'ground_training.view'

    assert HasRolePermission().has_permission(request, FakeView()) is True


@pytest.mark.django_db
def test_ground_training_update_allows_partial_update_action(make_perm):
    """A ground instructor holding ground_training.update can reschedule/cancel
    (partial_update action) a course."""
    group = Group.objects.create(name='ground_instructor')
    group.permissions.set([make_perm('ground_training.view_own'),
                           make_perm('ground_training.create'),
                           make_perm('ground_training.update')])

    user = User.objects.create_user(
        username='gi_user2', email='gi2@masterly.test',
        password='testpass123', role='ground_instructor',
        first_name='GI', last_name='Two',
    )
    user.groups.add(group)

    factory = APIRequestFactory()
    request = factory.patch('/api/courses/abc/', {})
    request.user = user

    class FakeView:
        action = 'partial_update'
        required_permission = 'ground_training.view'

    assert HasRolePermission().has_permission(request, FakeView()) is True


@pytest.mark.django_db
def test_view_only_does_not_imply_create_action(make_perm):
    """A reader with only ground_training.view cannot create courses."""
    group = Group.objects.create(name='reader')
    group.permissions.set([make_perm('ground_training.view')])

    user = User.objects.create_user(
        username='reader2', email='reader2@masterly.test',
        password='testpass123', role='student',
        first_name='R', last_name='Two',
    )
    user.groups.add(group)

    factory = APIRequestFactory()
    request = factory.post('/api/courses/', {})
    request.user = user

    class FakeView:
        action = 'create'
        required_permission = 'ground_training.view'

    assert HasRolePermission().has_permission(request, FakeView()) is False
