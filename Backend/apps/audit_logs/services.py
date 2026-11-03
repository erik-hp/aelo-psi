from typing import Any
from django.conf import settings
from .models import AuditLog
from .integrity import append_audit_log


def get_client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if settings.TRUST_PROXY_HEADERS and forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def audit(request, action: str, entity: Any, metadata: dict | None = None) -> AuditLog:
    user = getattr(request, "user", None)
    return append_audit_log(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        entity=entity.__class__.__name__,
        entity_id=str(getattr(entity, "pk", "")),
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        metadata=metadata or {},
    )
