"""
Tests for contract PDF generation and streaming.

Production runs with DEBUG=False (no static /media/ route) and files live in
the default MinIO storage, so generated contract PDFs must be persisted via
the default storage backend and served through an authenticated API action
(``/api/contracts/{id}/stream/``) rather than a ``/media/...`` URL.
"""
import io
from unittest import mock

import pytest
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.urls import reverse
from rest_framework import status


@pytest.fixture
def contract(db, student_profile):
    from apps.administration.models import Contract
    return Contract.objects.create(
        student=student_profile,
        contract_number='CTR-2026-0001',
        type='pilot_training',
        start_date='2026-01-01',
        end_date='2026-12-31',
        status='active',
    )


@pytest.fixture
def contract_admin_client(db):
    """APIClient for a training_admin with documents permissions (same as the
    library tests use)."""
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import Permission
    from django.contrib.contenttypes.models import ContentType
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken
    User = get_user_model()
    user = User.objects.create_user(
        username='training_admin', email='training@masterly.test',
        password='testpass123', role='training_admin',
        first_name='Training', last_name='Admin',
    )
    ct = ContentType.objects.get_for_model(User)
    for codename in ('documents.view', 'documents.create', 'documents.update', 'documents.delete'):
        perm, _ = Permission.objects.get_or_create(
            codename=codename, name=f'Documents {codename}', content_type=ct,
        )
        user.user_permissions.add(perm)
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


@pytest.mark.django_db
class TestContractPdf:
    def test_generate_pdf_returns_stream_endpoint(self, contract, contract_admin_client):
        """generate_pdf must return an API stream URL, never a /media/ path."""
        fake_html = mock.MagicMock()
        fake_html.return_value.write_pdf.return_value = b'%PDF-1.4 generated'
        fake_weasyprint = mock.MagicMock()
        fake_weasyprint.HTML = fake_html
        with mock.patch.dict('sys.modules', {'weasyprint': fake_weasyprint}):
            resp = contract_admin_client.post(reverse('contract-generate-pdf', kwargs={'pk': contract.pk}))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['file_url'].startswith('/api/contracts/')
        contract.refresh_from_db()
        assert contract.file_url
        assert not str(contract.file_url).startswith('/media/')

    def test_stream_returns_generated_pdf(self, contract, contract_admin_client):
        """The stream action serves the stored PDF with cookie/auth."""
        default_storage.save(contract.file_url or 'contracts/test.pdf', ContentFile(b'%PDF-1.4 test'))
        contract.file_url = 'contracts/test.pdf'
        contract.save(update_fields=['file_url'])
        resp = contract_admin_client.get(reverse('contract-stream', kwargs={'pk': contract.pk}))
        assert resp.status_code == status.HTTP_200_OK
        assert resp['Content-Type'].startswith('application/pdf')
        assert b'PDF' in resp.getvalue() or b'%PDF' in resp.getvalue() or b'test' in resp.getvalue()

    def test_stream_404_when_no_file(self, contract, contract_admin_client):
        """A contract without a stored file returns 404 rather than a broken view."""
        contract.file_url = None
        contract.save(update_fields=['file_url'])
        resp = contract_admin_client.get(reverse('contract-stream', kwargs={'pk': contract.pk}))
        assert resp.status_code == status.HTTP_404_NOT_FOUND
