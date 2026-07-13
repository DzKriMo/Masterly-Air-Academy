"""Request ID + logging middleware.

- RequestIdMiddleware assigns a unique short ID to every request and adds
  an X-Request-ID response header. The ID is stored on the request object
  and is available to the ApiResponseRenderer for tracing.

- RequestLogMiddleware logs all /api/ requests with user info.
"""

import logging
import uuid
import threading

logger = logging.getLogger("masterly.requests")

# Thread-local storage to make the current request accessible from signals
_request_local = threading.local()


class RequestIdMiddleware:
    """Assigns a unique request ID and makes the request available thread-locally."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.id = str(uuid.uuid4())[:8]
        _request_local.request = request

        response = self.get_response(request)
        response['X-Request-ID'] = request.id
        return response

    @staticmethod
    def get_current_request():
        """Return the current request from thread-local storage, or None."""
        return getattr(_request_local, 'request', None)


class RequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/"):
            user = getattr(request, "user", None)
            req_id = getattr(request, 'id', '-')
            logger.info(
                f"[{req_id}] {request.method} {request.path} | "
                f"user={user.email if user and user.is_authenticated else 'anon'} | "
                f"status={response.status_code}"
            )
        return response
