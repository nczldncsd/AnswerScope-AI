"""
Shared utilities for validation and normalization.
Keep lightweight and dependency-free.
"""

import re
from urllib.parse import urlparse

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(email):
    if not email:
        return ""
    return email.strip().lower()


def is_valid_email(email):
    if not email:
        return False
    return bool(_EMAIL_RE.match(email.strip().lower()))


def is_valid_url(url):
    if not url:
        return False
    try:
        parsed = urlparse(url.strip())
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


def parse_competitors(raw):
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(c).strip() for c in raw if str(c).strip()]
    if isinstance(raw, str):
        raw = raw.strip()
        if not raw:
            return []
        # Try JSON list first
        if raw.startswith("[") and raw.endswith("]"):
            try:
                import json
                data = json.loads(raw)
                if isinstance(data, list):
                    return [str(c).strip() for c in data if str(c).strip()]
            except Exception:
                pass
        # Fallback: comma-separated
        return [c.strip() for c in raw.split(",") if c.strip()]
    return []
