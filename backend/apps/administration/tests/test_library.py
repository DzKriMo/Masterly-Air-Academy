"""Tests for the Library (document) visibility, upload and versioning features."""
import pytest
from django.utils import timezone
from datetime import timedelta


@pytest.fixture
def library_doc(db, promotion, user_admin):
    from apps.administration.models import Document, LibraryCategory
    cat, _ = LibraryCategory.objects.get_or_create(name='Training Materials')
    return Document.objects.create(
        name='Shared Manual',
        description='Visible to everyone',
        file_url='library/manual.pdf',
        mime_type='application/pdf',
        file_size=1024,
        is_public=True,
        library_category=cat,
        uploaded_by=user_admin,
    )


@pytest.fixture
def role_doc(db, user_admin):
    from apps.administration.models import Document
    return Document.objects.create(
        name='Instructor Only',
        file_url='library/instructor.pdf',
        mime_type='application/pdf',
        file_size=2048,
        is_public=False,
        visible_to_roles=['flight_instructor'],
        uploaded_by=user_admin,
    )


@pytest.fixture
def promotion_doc(db, promotion, user_admin):
    from apps.administration.models import Document
    return Document.objects.create(
        name='Promotion PPL',
        file_url='library/ppl.pdf',
        mime_type='application/pdf',
        file_size=512,
        is_public=False,
        uploaded_by=user_admin,
    )


@pytest.fixture
def expired_doc(db, user_admin):
    from apps.administration.models import Document
    return Document.objects.create(
        name='Old Circular',
        file_url='library/old.pdf',
        mime_type='application/pdf',
        file_size=300,
        is_public=True,
        expiry_date=timezone.now() - timedelta(days=1),
        uploaded_by=user_admin,
    )


@pytest.fixture
def staff_with_docs_view(db):
    """A non-manager staff user (finance_responsible) with documents.view."""
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import Permission
    from django.contrib.contenttypes.models import ContentType
    User = get_user_model()
    user = User.objects.create_user(
        username='finance_staff', email='finance@masterly.test',
        password='testpass123', role='finance_responsible',
        first_name='Fin', last_name='Staff',
    )
    ct = ContentType.objects.get_for_model(User)
    perm, _ = Permission.objects.get_or_create(
        codename='documents.view', name='Documents view', content_type=ct,
    )
    user.user_permissions.add(perm)
    return user


@pytest.fixture
def student_with_docs_view(student_profile):
    from django.contrib.auth.models import Permission
    from django.contrib.contenttypes.models import ContentType
    from apps.accounts.models import User
    ct = ContentType.objects.get_for_model(User)
    perm, _ = Permission.objects.get_or_create(
        codename='documents.view', name='Documents view', content_type=ct,
    )
    student_profile.user.user_permissions.add(perm)
    return student_profile.user


class TestLibraryVisibility:
    def test_public_doc_visible_to_staff(self, api_client, library_doc, staff_with_docs_view):
        api_client.force_authenticate(user=staff_with_docs_view)
        resp = api_client.get('/api/documents/')
        assert resp.status_code == 200
        names = [d['name'] for d in resp.data['results']]
        assert 'Shared Manual' in names

    def test_role_scoped_doc_hidden_from_other_roles(self, api_client, role_doc, staff_with_docs_view):
        api_client.force_authenticate(user=staff_with_docs_view)
        resp = api_client.get('/api/documents/')
        names = [d['name'] for d in resp.data['results']]
        assert 'Instructor Only' not in names

    def test_role_scoped_doc_visible_to_matching_role(self, api_client, role_doc, user_instructor):
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType
        from apps.accounts.models import User
        ct = ContentType.objects.get_for_model(User)
        perm, _ = Permission.objects.get_or_create(
            codename='documents.view', name='Documents view', content_type=ct,
        )
        user_instructor.user_permissions.add(perm)
        api_client.force_authenticate(user=user_instructor)
        resp = api_client.get('/api/documents/')
        names = [d['name'] for d in resp.data['results']]
        assert 'Instructor Only' in names

    def test_student_sees_promotion_doc(self, api_client, student_with_docs_view, promotion_doc, student_profile, promotion):
        promotion_doc.promotions.add(promotion)
        api_client.force_authenticate(user=student_with_docs_view)
        resp = api_client.get('/api/documents/')
        names = [d['name'] for d in resp.data['results']]
        assert 'Promotion PPL' in names

    def test_student_hidden_from_other_promotion(self, api_client, student_with_docs_view, promotion_doc, second_student_profile, promotion):
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType
        from apps.students.models import Promotion as PromotionModel
        from apps.accounts.models import User
        # Give Alice a different promotion (CPL) so she is NOT in the PPL one.
        other = PromotionModel.objects.create(
            code='CPL-2025-A', program='CPL', name='CPL 2025 Alpha',
            start_date=second_student_profile.enrollment_date,
        )
        second_student_profile.promotion = other
        second_student_profile.save(update_fields=['promotion'])
        ct = ContentType.objects.get_for_model(User)
        perm, _ = Permission.objects.get_or_create(
            codename='documents.view', name='Documents view', content_type=ct,
        )
        second_student_profile.user.user_permissions.add(perm)
        promotion_doc.promotions.add(promotion)
        api_client.force_authenticate(user=second_student_profile.user)
        resp = api_client.get('/api/documents/')
        names = [d['name'] for d in resp.data['results']]
        assert 'Promotion PPL' not in names

    def test_expired_doc_hidden_from_non_manager(self, api_client, expired_doc, staff_with_docs_view):
        api_client.force_authenticate(user=staff_with_docs_view)
        resp = api_client.get('/api/documents/')
        names = [d['name'] for d in resp.data['results']]
        assert 'Old Circular' not in names

    def test_manager_sees_everything(self, api_client, expired_doc, role_doc, promotion_doc, auth_client):
        resp = auth_client.get('/api/documents/')
        assert resp.status_code == 200
        names = [d['name'] for d in resp.data['results']]
        assert 'Old Circular' in names
        assert 'Instructor Only' in names


class TestLibraryUpload:
    def test_upload_creates_public_doc(self, api_client, auth_client):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile('notes.pdf', b'%PDF-1.4 fake', content_type='application/pdf')
        resp = auth_client.post('/api/documents/upload/', {
            'file': f,
            'name': 'Course Notes',
            'is_public': 'true',
            'visible_to_roles': '',
        })
        assert resp.status_code == 201, resp.content
        assert resp.data['name'] == 'Course Notes'
        assert resp.data['is_public'] is True

    def test_upload_creates_category_inline(self, api_client, auth_client):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile('rules.pdf', b'%PDF-1.4 fake', content_type='application/pdf')
        resp = auth_client.post('/api/documents/upload/', {
            'file': f,
            'name': 'Rules',
            'new_category': 'Safety Manuals',
        })
        assert resp.status_code == 201, resp.content
        from apps.administration.models import LibraryCategory
        assert LibraryCategory.objects.filter(name='Safety Manuals').exists()

    def test_non_manager_cannot_upload_library_doc(self, api_client, staff_with_docs_view):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile('x.pdf', b'%PDF-1.4 fake', content_type='application/pdf')
        api_client.force_authenticate(user=staff_with_docs_view)
        resp = api_client.post('/api/documents/upload/', {'file': f, 'name': 'X'})
        assert resp.status_code == 403

    def test_reupload_bumps_version(self, api_client, auth_client, library_doc):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile('manual_v2.pdf', b'%PDF-1.4 version2', content_type='application/pdf')
        resp = auth_client.post(f'/api/documents/{library_doc.id}/reupload/', {'file': f})
        assert resp.status_code == 200, resp.content
        assert resp.data['version'] == 2
        assert len(resp.data['version_history']) == 1


class TestLibraryCategories:
    def test_categories_list(self, api_client, auth_client):
        resp = auth_client.get('/api/documents/categories/')
        assert resp.status_code == 200
        assert isinstance(resp.data, list)
        assert any(c['name'] == 'Training Materials' for c in resp.data)

    def test_create_category_requires_manager(self, api_client, staff_with_docs_view):
        api_client.force_authenticate(user=staff_with_docs_view)
        resp = api_client.post('/api/documents/create_category/', {'name': 'Nope'})
        assert resp.status_code == 403
