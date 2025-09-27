"""Utilities for applying simple request throttling policies."""

from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from time import monotonic, sleep


@dataclass
class Throttler:
    """A simple fixed-interval throttler.

    The Congress.gov API permits a generous hourly quota, but the
    exporter operates conservatively at roughly one request per second.
    The :class:`Throttler` can be shared by multiple API helper
    functions to ensure calls are spaced at or above the configured
    minimum interval.
    """

    min_interval: float = 1.0
    _lock: Lock = field(default_factory=Lock, init=False, repr=False)
    _last_request_ts: float | None = field(default=None, init=False, repr=False)

    def wait(self) -> None:
        """Sleep until the next request is allowed.

        The implementation uses a lock so that only one caller computes
        the wait time at a time, preventing stampedes when the throttler
        is shared across threads.
        """

        with self._lock:
            now = monotonic()
            if self._last_request_ts is not None:
                elapsed = now - self._last_request_ts
                if elapsed < self.min_interval:
                    sleep(self.min_interval - elapsed)
            self._last_request_ts = monotonic()


__all__ = ["Throttler"]

