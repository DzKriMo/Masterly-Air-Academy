"""Custom DRF renderer that wraps all successful responses in a standard envelope.

Architecture.md §6.2 specifies:
  { "success": true, "data": {...}, "meta": {...} }

Error responses are handled by the custom exception handler in exceptions.py.
"""

from rest_framework.renderers import JSONRenderer


class ApiResponseRenderer(JSONRenderer):
    """Wraps successful (2xx) DRF responses in {success, data, meta} envelope.

    The original DRF response body becomes `data` unchanged, so existing
    frontend code accessing `.results`, `.count`, etc. continues to work.
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response') if renderer_context else None

        if response is not None and 200 <= response.status_code < 400:
            meta = {}

            # Attach request_id if the middleware set it
            request = renderer_context.get('request') if renderer_context else None
            if request and hasattr(request, 'id'):
                meta['request_id'] = request.id

            # Duplicate pagination info in meta for convenience
            if isinstance(data, dict):
                if 'count' in data and 'results' in data:
                    meta['pagination'] = {
                        'count': data.get('count'),
                        'next': data.get('next'),
                        'previous': data.get('previous'),
                    }

            wrapped = {
                'success': True,
                'data': data if data is not None else {},
                'meta': meta,
            }
            return super().render(wrapped, accepted_media_type, renderer_context)

        return super().render(data, accepted_media_type, renderer_context)
