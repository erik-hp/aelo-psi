"""Keyed, ordered integrity chain for audit events."""

import hashlib
import hmac
import json

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction

from .models import AuditChainState, AuditLog


def _key() -> bytes:
    key = settings.AUDIT_LOG_HMAC_KEY
    if len(key) < 32 or key.startswith("replace-with"):
        raise ImproperlyConfigured("AUDIT_LOG_HMAC_KEY must be a separate random secret of at least 32 characters.")
    return key.encode("utf-8")


def entry_hash(entry) -> str:
    payload = {
        "id": str(entry.id),
        "sequence": entry.sequence,
        "previous_hash": entry.previous_hash,
        "actor_id": entry.actor_id,
        "action": entry.action,
        "entity": entry.entity,
        "entity_id": entry.entity_id,
        "ip_address": entry.ip_address,
        "user_agent": entry.user_agent,
        "metadata": entry.metadata,
        "created_at": entry.created_at.isoformat(),
    }
    message = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str).encode("utf-8")
    return hmac.new(_key(), message, hashlib.sha256).hexdigest()


@transaction.atomic
def append_audit_log(**values) -> AuditLog:
    state = AuditChainState.objects.select_for_update().get(pk=1)
    values["actor_id"] = str(values["user"].pk) if values.get("user") else ""
    entry = AuditLog.objects.create(
        **values,
        sequence=state.sequence + 1,
        previous_hash=state.head_hash,
    )
    entry.entry_hash = entry_hash(entry)
    AuditLog.objects.filter(pk=entry.pk).update(entry_hash=entry.entry_hash)
    state.sequence = entry.sequence
    state.head_hash = entry.entry_hash
    state.save(update_fields=["sequence", "head_hash"])
    return entry


def verify_audit_chain() -> tuple[bool, str]:
    state = AuditChainState.objects.get(pk=1)
    expected_previous = ""
    expected_sequence = 1
    for entry in AuditLog.objects.order_by("sequence").iterator():
        if entry.sequence != expected_sequence or entry.previous_hash != expected_previous:
            return False, f"Broken audit chain at sequence {expected_sequence}."
        if not hmac.compare_digest(entry.entry_hash, entry_hash(entry)):
            return False, f"Invalid audit hash at sequence {expected_sequence}."
        expected_previous = entry.entry_hash
        expected_sequence += 1
    if state.sequence != expected_sequence - 1 or state.head_hash != expected_previous:
        return False, "Audit chain head does not match the stored entries."
    return True, f"Verified {state.sequence} audit entries."
