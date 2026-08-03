"""Custom DRF renderer that wraps all successful responses in a standard envelope.

Architecture.md §6.2 specifies:
  { "success": true, "data": {...}, "meta": {...} }

Error responses are handled by the custom exception handler in exceptions.py.
"""

from rest_framework.renderers import JSONRenderer, BaseRenderer


class SSEEventRenderer(BaseRenderer):
    """Renderer satisfying Accept: text/event-stream for SSE endpoints.

    DRF performs content negotiation before an action runs, so streaming
    endpoints must advertise a renderer matching the browser's Accept header
    (text/event-stream) or requests are rejected with HTTP 406. The actual
    streamed bytes come from a plain StreamingHttpResponse, so this renderer
    is only used to pass negotiation.
    """

    media_type = 'text/event-stream'
    format = 'sse'
    charset = 'utf-8'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class ApiResponseRenderer(JSONRenderer):
    """Wraps successful (2xx) DRF responses in {success, data, meta} envelope.

    The original DRF response body becomes `data` unchanged, so existing
    frontend code accessing `.results`, `.count`, etc. continues to work.
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response') if renderer_context else None

        if response is not None and 200 <= response.status_code < 400:
            request = renderer_context.get('request') if renderer_context else None

            # If data already has its own meta (from StandardPagination), use it
            if isinstance(data, dict) and 'meta' in data and 'data' in data:
                wrapped_meta = data['meta']
                if request and hasattr(request, 'id'):
                    wrapped_meta['request_id'] = request.id
                wrapped = {
                    'success': True,
                    'data': data['data'],
                    'meta': wrapped_meta,
                }
                return super().render(wrapped, accepted_media_type, renderer_context)

            # Non-paginated response: wrap in envelope
            meta = {}
            if request and hasattr(request, 'id'):
                meta['request_id'] = request.id

            wrapped = {
                'success': True,
                'data': data if data is not None else {},
                'meta': meta,
            }
            return super().render(wrapped, accepted_media_type, renderer_context)

        return super().render(data, accepted_media_type, renderer_context)
