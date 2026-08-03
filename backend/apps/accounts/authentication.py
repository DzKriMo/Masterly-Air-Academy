from rest_framework_simplejwt.authentication import JWTAuthentication


class QueryTokenAuthentication(JWTAuthentication):
    """
    Accept the JWT access token via a `token` query parameter instead of the
    Authorization header. Needed for HTML5 media requests (e.g. <video src>)
    which cannot attach custom headers. The token still must be a valid JWT,
    so security is not weakened beyond the normal bearer-token model.
    """

    def get_header(self, request):
        token = request.query_params.get('token')
        if token:
            return f'Bearer {token}'.encode('ascii')
        return super().get_header(request)
