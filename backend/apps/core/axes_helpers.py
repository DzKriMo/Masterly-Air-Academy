"""django-axes helpers.

The API sits behind nginx, so ``REMOTE_ADDR`` is the nginx container's IP for
every inbound request. If django-axes trusted that, a single attacker could
trip the lockout for *every* user on the platform. These helpers make axes key
on the real client address taken from ``X-Forwarded-For``.
"""


def get_client_ip(request):
    """Return the originating client IP for a proxied request.

    ``X-Forwarded-For`` is a comma-separated chain, left-most entry being the
    original client. The chain is only trusted because this deployment always
    terminates TLS at the host nginx, which overwrites the header before it
    reaches the app container.
    """
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded_for:
        # Left-most entry is the original client; a proxied chain may append
        # internal hops, which are ignored.
        first_hop = forwarded_for.split(',')[0].strip()
        if first_hop:
            return first_hop
    return request.META.get('REMOTE_ADDR', '')
