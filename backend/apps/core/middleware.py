"""Request logging middleware — logs all API requests with user info."""
import logging

logger = logging.getLogger("masterly.requests")


class RequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/"):
            user = getattr(request, "user", None)
            logger.info(
                f"{request.method} {request.path} | "
                f"user={user.email if user and user.is_authenticated else 'anon'} | "
                f"status={response.status_code}"
            )
        return response
