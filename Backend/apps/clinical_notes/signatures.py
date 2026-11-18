"""ECDSA P-256 account-key signatures for clinical note signing and formal rectification (F1-03)."""

import hashlib
import json

from apps.ai_analysis.signatures import verify_raw_signature


def note_signing_payload(
    note,
    *,
    action: str,
    raw_text: str,
    version: int,
    signer_id: int,
    reason: str = "",
) -> bytes:
    payload = {
        "format": "aelo-note-v1",
        "action": action,
        "note_id": str(note.id),
        "patient_id": str(note.patient_id),
        "session_id": str(note.session_id) if note.session_id else "",
        "signer_id": signer_id,
        "version": version,
        "text_sha256": hashlib.sha256(raw_text.encode("utf-8")).hexdigest(),
        "reason": reason,
    }
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def verify_note_signature(note, *, reason: str = "") -> bool:
    if not note.signature or not note.public_key_spki or not note.signed_by_id:
        return False
    action = "AMEND" if note.status == "AMENDED" else "SIGN"
    payload = note_signing_payload(
        note,
        action=action,
        raw_text=note.raw_text,
        version=note.version,
        signer_id=note.signed_by_id,
        reason=reason,
    )
    return (
        hashlib.sha256(payload).hexdigest() == note.signed_payload_sha256
        and verify_raw_signature(note.public_key_spki, note.signature, payload)
    )
