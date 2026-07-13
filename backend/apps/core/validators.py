"""File upload validators — size, extension, and MIME type checks."""

import os
from django.core.exceptions import ValidationError


def validate_file_size(value, max_size_mb=10):
    """Reject files larger than max_size_mb."""
    limit = max_size_mb * 1024 * 1024
    if value.size > limit:
        raise ValidationError(f'File too large. Maximum size is {max_size_mb}MB.')


def validate_file_extension(value, allowed_extensions):
    """Reject files with disallowed extensions."""
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in allowed_extensions:
        raise ValidationError(
            f'Unsupported file type "{ext}". Allowed: {", ".join(allowed_extensions)}'
        )


# ── Pre-built validators for common upload types ──

def validate_photo(value):
    """Student/instructor photos: images only, max 5MB."""
    validate_file_size(value, max_size_mb=5)
    validate_file_extension(value, {'.jpg', '.jpeg', '.png', '.webp'})


def validate_document(value):
    """Administrative/pedagogical documents: PDF/DOC/XLS, max 20MB."""
    validate_file_size(value, max_size_mb=20)
    validate_file_extension(value, {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'})


def validate_certificate_file(value):
    """Certificate files: PDF only, max 5MB."""
    validate_file_size(value, max_size_mb=5)
    validate_file_extension(value, {'.pdf'})


def validate_quality_document(value):
    """Quality documents: PDF, max 20MB."""
    validate_file_size(value, max_size_mb=20)
    validate_file_extension(value, {'.pdf', '.doc', '.docx'})
