"""Backwards-compatible shim for the old django-axes client-IP helper.

The original implementation here read the *left-most* ``X-Forwarded-For``
entry, which is forgeable because both nginx layers append to the header rather
than replacing it. That let a client spoof its address in django-axes records
and, worse, rotate a fake address per request to bypass the brute-force lockout.

The real resolver now lives in :mod:`apps.core.client_ip`, which walks the chain
from the right and skips only explicitly trusted proxy networks. This module is
kept so that any lingering import keeps behaving safely.
"""

from apps.core.client_ip import get_client_ip  # noqa: F401

__all__ = ['get_client_ip']
