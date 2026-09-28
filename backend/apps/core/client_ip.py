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


def get_client_ip(request):
    """Return the originating client IP for a (possibly proxied) request.

    The chain is walked from the RIGHT and the first entry that is not a
    configured trusted proxy wins. Each real proxy appends the address of the
    machine talking to it, so the right-most non-trusted entry is the client and
    everything to its left is either an internal hop or a forged value.

    ``X-Real-IP`` is deliberately NOT trusted. nginx overwrites it today, but
    nothing in the request itself guarantees that, and honouring it would let a
    client that reaches the app through any hop that forwards the header choose
    its own recorded address. The X-Forwarded-For walk needs no such assumption.
    """
    if request is None:
        return ''

    resolved = _resolve_client_ip(request)

    # Useful when the proxy topology changes; silent otherwise.
    logger.debug(
        'client ip: remote_addr=%s x_real_ip=%s xff=%s -> %s',
        request.META.get('REMOTE_ADDR'),
        request.META.get('HTTP_X_REAL_IP'),
        request.META.get('HTTP_X_FORWARDED_FOR'),
        resolved,
    )
    return resolved


def _resolve_client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '') or ''
    for hop in reversed([part for part in forwarded_for.split(',') if part.strip()]):
        if is_trusted_proxy(hop):
            continue
        parsed = _parse_ip(hop)
        if parsed is not None:
            return str(parsed)

    # No usable X-Forwarded-For entry: fall back to the direct peer, which for
    # this deployment is the container nginx rather than a real client.
    return (request.META.get('REMOTE_ADDR', '') or '').strip()
