"""
httpOnly-cookie JWT authentication for the SPA.

The frontend no longer reads tokens from localStorage — the access JWT lives in
the `maa_access` cookie (15 min) and the rotating refresh JWT in `maa_refresh`
(7 days), both HttpOnly, Secure (prod) and SameSite=Lax.

CSRF is enforced on state-changing requests that are authenticated *via these
cookies* (mirroring DRF's SessionAuthentication). Requests authenticated via the
Authorization header (API tooling, curl, tests) stay CSRF-exempt.
"""
from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt import settings as jwt_settings

ACCESS_COOKIE = 'maa_access'
REFRESH_COOKIE = 'maa_refresh'

ACCESS_COOKIE_MAX_AGE = int(jwt_settings.api_settings.ACCESS_TOKEN_LIFETIME.total_seconds())
REFRESH_COOKIE_MAX_AGE = int(jwt_settings.api_settings.REFRESH_TOKEN_LIFETIME.total_seconds())


def _cookie_secure() -> bool:
    return getattr(settings, 'MAA_COOKIE_SECURE', not settings.DEBUG)


def _cookie_samesite() -> str:
    return getattr(settings, 'MAA_COOKIE_SAMESITE', 'Lax')


def set_auth_cookies(response, access=None, refresh=None):
    """Attach the auth cookies to a response (login/refresh)."""
    if access:
        response.set_cookie(
            ACCESS_COOKIE,
            access,
            max_age=ACCESS_COOKIE_MAX_AGE,
            httponly=True,
            secure=_cookie_secure(),
            samesite=_cookie_samesite(),
            path='/',
        )
    if refresh:
        response.set_cookie(
            REFRESH_COOKIE,
            refresh,
            max_age=REFRESH_COOKIE_MAX_AGE,
            httponly=True,
            secure=_cookie_secure(),
            samesite=_cookie_samesite(),
            path='/',
        )
    return response


def delete_auth_cookies(response):
    """Expire the auth cookies on a response (logout)."""
    for name in (ACCESS_COOKIE, REFRESH_COOKIE):
        response.delete_cookie(name, path='/')
    return response


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate a user whose access JWT arrives in the `maa_access` cookie.

    Falls through (returns None) when the cookie is missing OR invalid/expired,
    letting later authenticators (header JWT, sessions) or anonymous handling
    take over — so an expired access cookie still yields a clean 401 that the
    frontend answers with a cookie-based refresh.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get(ACCESS_COOKIE)
        if not raw_token:
            return None
        try:
            validated_token = self.get_validated_token(raw_token)
        except TokenError:
            return None
        user = self.get_user(validated_token)
        self.enforce_csrf(request)
        return (user, validated_token)

    def enforce_csrf(self, request):
        """Reject state-changing cookie-authenticated requests without a
        valid X-CSRFToken header (mirrors DRF SessionAuthentication)."""
        def dummy_get_response(request):  # pragma: no cover
            return None

        check = CsrfViewMiddleware(dummy_get_response)
        # populates request.META['CSRF_COOKIE'], used by process_view()
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied('CSRF Failed: %s' % reason)
