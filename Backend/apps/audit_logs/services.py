"""Minimal, structured security audit events (no clinical narratives).

Never accept arbitrary user-supplied strings as audit metadata. Patient and
record contents belong in protected clinical storage, not an audit log.
"""
from typing import Any

from .models import AuditLog


_ALLOWED_MODULES = frozenset({
    "authentication", "authorization", "users", "patients",
    "therapy_sessions", "clinical_notes", "ai_analysis", "dashboard",
})
_ALLOWED_METHODS = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE"})


def get_client_ip(request) -> str | None:
    # HTTP_X_FORWARDED_FOR is attacker controlled without an explicitly
    # configured, trusted reverse proxy. Record REMOTE_ADDR only.
    return request.META.get("REMOTE_ADDR")


def sanitized_metadata(metadata: dict | None) -> dict:
    """Allowlist audit fields; discard free-text comments, prompts and notes."""
    if not isinstance(metadata, dict):
        return {}
    clean = {}
    module = metadata.get("module")
    if isinstance(module, str) and module in _ALLOWED_MODULES:
        clean["module"] = module
    method = metadata.get("method")
    if isinstance(method, str) and method in _ALLOWED_METHODS:
        clean["method"] = method
    for field in ("version", "status_code"):
        value = metadata.get(field)
        if type(value) is int and 0 <= value <= 9999:
            clean[field] = value
    return clean


def audit(request, action: str, entity: Any, metadata: dict | None = None) -> AuditLog:
    user = getattr(request, "user", None)
    return AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action[:64],
        entity=entity.__class__.__name__[:120],
        entity_id=str(getattr(entity, "pk", ""))[:64],
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:256],
        metadata=sanitized_metadata(metadata),
    )
