"""Shared upload validation guard for all file-upload endpoints.

Centralizes size + MIME + extension checks so every upload path enforces the
same limits instead of each view rolling its own (or none at all).
"""

# Max upload size in bytes (25 MB — covers photos, documents and lesson videos)
MAX_UPLOAD_SIZE = 25 * 1024 * 1024

# (mime, [extensions])
ALLOWED_UPLOAD_TYPES = {
    'image/jpeg': {'.jpg', '.jpeg'},
    'image/png': {'.png'},
    'image/webp': {'.webp'},
    'image/gif': {'.gif'},
    'application/pdf': {'.pdf'},
    'text/plain': {'.txt'},
    'application/msword': {'.doc'},
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {'.docx'},
    'application/vnd.ms-excel': {'.xls'},
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {'.xlsx'},
    'application/vnd.ms-powerpoint': {'.ppt'},
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': {'.pptx'},
    'application/zip': {'.zip'},
    'text/csv': {'.csv'},
    'video/mp4': {'.mp4'},
    'video/webm': {'.webm'},
    'video/quicktime': {'.mov'},
}


def validate_upload(file, max_size=MAX_UPLOAD_SIZE, allowed=None):
    """Validate an uploaded file. Returns (ok, error_message).

    - Rejects empty files.
    - Rejects files over ``max_size``.
    - Rejects MIME types (and mismatched extensions) not in ``allowed``.
    The client-provided ``content_type`` is treated as a hint and cross-checked
    against the file extension; both must be acceptable.
    """
    if file is None:
        return False, 'No file provided'

    if file.size <= 0:
        return False, 'Empty files are not allowed'

    if file.size > max_size:
        return False, f'File must be under {max_size // (1024 * 1024)} MB'

    allowed = allowed if allowed is not None else ALLOWED_UPLOAD_TYPES

    mime = (getattr(file, 'content_type', '') or 'application/octet-stream').lower()
    ext = ''
    name = getattr(file, 'name', '') or ''
    if '.' in name:
        ext = f'.{name.rsplit(".", 1)[-1].lower()}'

    mime_allowed = mime in allowed
    ext_allowed = ext in allowed.get(mime, set()) if mime_allowed else False

    # Accept when the declared MIME is allowed, and the extension either
    # matches it or the file has no extension at all.
    if mime_allowed and (ext_allowed or ext == ''):
        return True, None

    return False, 'Unsupported file type'
