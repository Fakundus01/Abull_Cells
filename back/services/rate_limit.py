from __future__ import annotations

import time
from collections import defaultdict, deque

from flask import Request

_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


def _prune(bucket: deque[float], now: float, window_seconds: int) -> None:
    cutoff = now - window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.popleft()


def rate_limit_exceeded(key: str, limit: int, window_seconds: int) -> bool:
    now = time.monotonic()
    bucket = _BUCKETS[key]
    _prune(bucket, now, window_seconds)
    if len(bucket) >= limit:
        return True
    bucket.append(now)
    return False


def rate_limit_key(request: Request, action: str, email: str | None = None) -> str:
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    if ip and "," in ip:
        ip = ip.split(",")[0].strip()
    email_part = email.lower().strip() if email else "-"
    return f"{action}:{ip}:{email_part}"