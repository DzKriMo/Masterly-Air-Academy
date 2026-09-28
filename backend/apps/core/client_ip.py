"""Resolve the real client IP for requests that arrive through a proxy chain.

Why this exists
---------------
The app is never reached directly. Traffic flows::

    client -> host nginx (TLS, :443) -> container nginx (:7788) -> Django

So ``request.META['REMOTE_ADDR']`` is *always* the container nginx address
(172.19.0.14), which is useless for audit trails and worse than useless for
brute-force lockout: every visitor shares it, so a single attacker would trip
the lockout for the whole platform.

Why the naive fix is unsafe
---------------------------
Both nginx layers use ``$proxy_add_x_forwarded_for``, which *appends* to an
incoming ``X-Forwarded-For`` rather than replacing it. A client can therefore
send its own header and the chain reaching Django becomes::

    "1.2.3.4, <real client>, 172.19.0.1"

Taking the left-most entry - the usual recipe - returns the attacker-supplied
``1.2.3.4``. That is forgeable, so it cannot be used for audit evidence and it
lets an attacker rotate a fake IP per request to walk straight around the
django-axes lockout.

How this resolves it
--------------------
Walk the chain from the RIGHT and return the first entry that is not a known
trusted proxy. Everything to the left of that is either internal hops or
attacker-forged noise, and is discarded. A single genuine client address always
survives as the right-most non-trusted entry, because each real proxy appends
the address of the machine talking to it.

Private LAN clients are handled correctly: only the explicitly configured proxy
networks are skipped, so a user on 192.168.1.50 is returned as-is instead of
being skipped as "private".
"""

import ipaddress
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _trusted_networks():
    """Parse TRUSTED_PROXY_CIDRS into ipaddress networks.

    Cached per distinct configuration value so that changing the setting (tests,
    or a process that reloads it) takes effect immediately instead of serving a
    stale trust list.
    """
    configured = tuple(getattr(settings, 'TRUSTED_PROXY_CIDRS', ()) or ())
    cached = getattr(_trusted_networks, '_cache', None)
    if cached is not None and cached[0] == configured:
        return cached[1]

    networks = []
    for raw in configured:
        try:
            networks.append(ipaddress.ip_network(str(raw).strip(), strict=False))
        except ValueError:
            logger.warning('Ignoring invalid TRUSTED_PROXY_CIDRS entry: %r', raw)

    _trusted_networks._cache = (configured, tuple(networks))
    return _trusted_networks._cache[1]


def _reset_cache():
    """Drop the parsed-network cache (used by tests)."""
    if hasattr(_trusted_networks, '_cache'):
        del _trusted_networks._cache


def _parse_ip(value):
    value = (value or '').strip()
    if not value:
        return None
    # Strip an IPv6 bracket/port form such as "[::1]:443" or "1.2.3.4:5678".
    if value.startswith('['):
        host = value[1:].split(']')[0]
    elif value.count(':') == 1:
        host = value.split(':')[0]
    else:
        host = value
    try:
        return ipaddress.ip_address(host)
    except ValueError:
        return None


def is_trusted_proxy(value):
    """True when the given address is one of our own reverse proxies."""
    address = _parse_ip(value)
    if address is None:
        return False
    return any(address in net for net in _trusted_networks())


def get_client_ip(request, prefer_x_real_ip=True):
    """Return the originating client IP for a (possibly proxied) request.

    Order of trust:

    1. ``X-Real-IP`` - but only when it is *not* itself one of our own proxies.
       The container nginx also sets this header, and the peer it observes is the
       docker gateway, so an unconditional preference here would stamp every
       audit row with 172.19.0.1 instead of the client.
    2. ``X-Forwarded-For`` - scanned right-to-left for the first non-trusted
       entry, so forged leading entries are ignored.
    3. ``REMOTE_ADDR`` - last resort; this is the proxy's own address.
    """
    if request is None:
        return ''

    resolved = _resolve_client_ip(request, prefer_x_real_ip)

    # Useful when the proxy topology changes; silent otherwise.
    logger.debug(
        'client ip: remote_addr=%s x_real_ip=%s xff=%s -> %s',
        request.META.get('REMOTE_ADDR'),
        request.META.get('HTTP_X_REAL_IP'),
        request.META.get('HTTP_X_FORWARDED_FOR'),
        resolved,
    )
    return resolved


def _resolve_client_ip(request, prefer_x_real_ip=True):
    if prefer_x_real_ip:
        real_ip_raw = (request.META.get('HTTP_X_REAL_IP', '') or '').strip()
        if real_ip_raw and not is_trusted_proxy(real_ip_raw):
            parsed_real = _parse_ip(real_ip_raw)
            if parsed_real is not None:
                return str(parsed_real)

    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '') or ''
    for hop in reversed([part for part in forwarded_for.split(',') if part.strip()]):
        if is_trusted_proxy(hop):
            continue
        parsed = _parse_ip(hop)
        if parsed is not None:
            return str(parsed)

    # Everything in the chain was a trusted proxy (direct internal call).
    return (request.META.get('REMOTE_ADDR', '') or '').strip()
