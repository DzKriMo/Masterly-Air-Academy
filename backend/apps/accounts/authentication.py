import json

from django.contrib.auth import get_user_model
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from rest_framework.authentication import BaseAuthentication

# Media tokens are intentionally short-lived so that they can safely appear in
# URLs (e.g. <video src>, <iframe>) without leaking a long-lived JWT into
# proxy logs, browser history, or the Referer header.
MEDIA_TOKEN_MAX_AGE = 300  # seconds

_signer = TimestampSigner()


def sign_media_token(user_id, resource):
    """Sign a short-lived media-access token bound to one resource.

    `resource` is the object pk (e.g. lesson id) the token may be used for.
    """
    payload = json.dumps({'u': str(user_id), 'r': str(resource)})
    return _signer.sign(payload)


class SignedMediaAuthentication(BaseAuthentication):
    """Authenticates short-lived signed media tokens passed as `?media=`.

    The token is HMAC-signed with the Django SECRET_KEY, expires after
    MEDIA_TOKEN_MAX_AGE seconds and is bound to a single resource pk, so a
    leaked URL only grants temporary access to that one object. Falls through
    (returns None) when no `media` parameter is present, letting the usual
    header-based authenticators handle the request.
    """

    def authenticate(self, request):
        token = request.query_params.get('media')
        if not token:
            return None
        try:
            payload = _signer.unsign(token, max_age=MEDIA_TOKEN_MAX_AGE)
            data = json.loads(payload)
            user_id = data['u']
            resource = str(data['r'])
        except (BadSignature, SignatureExpired, ValueError, KeyError, TypeError):
            return None

        match = request.resolver_match
        pk = str(match.kwargs.get('pk') or '') if match else ''
        if pk and pk != resource:
            return None

        user = get_user_model().objects.filter(pk=user_id).first()
        if user is None or not user.is_active:
            return None
        return (user, token)
