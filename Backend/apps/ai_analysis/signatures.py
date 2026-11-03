"""Account-key signatures over the exact AI result a clinician reviewed."""

import base64
import binascii
import hashlib
import json

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature


def public_key_from_spki(encoded: str):
    try:
        der = base64.b64decode(encoded, validate=True)
        if len(der) > 512:
            raise ValueError("Public key is too large.")
        key = serialization.load_der_public_key(der)
    except (ValueError, TypeError, binascii.Error) as exc:
        raise ValueError("Invalid signing public key.") from exc
    if not isinstance(key, ec.EllipticCurvePublicKey) or not isinstance(key.curve, ec.SECP256R1):
        raise ValueError("Signing key must be ECDSA P-256.")
    return key, hashlib.sha256(der).hexdigest()


def signing_payload(analysis, *, decision: str, comment: str, reviewer_id: int) -> bytes:
    sources = [
        {"note_id": str(source.note_id) if source.note_id else "", "excerpt": source.excerpt,
         "relevance_score": str(source.relevance_score)}
        for source in analysis.sources.order_by("id")
    ]
    metrics = [
        {"label": metric.label, "value": str(metric.value), "metadata": metric.metadata}
        for metric in analysis.sentiment_metrics.order_by("id")
    ]
    content = {
        "patterns": analysis.patterns,
        "longitudinal_evolution": analysis.longitudinal_evolution,
        "attention_points": analysis.attention_points,
        "narrative_metrics": analysis.narrative_metrics,
        "behavioral_changes": analysis.behavioral_changes,
        "longitudinal_coherence": analysis.longitudinal_coherence,
        "possible_inconsistencies": analysis.possible_inconsistencies,
        "relevance_score": str(analysis.relevance_score),
        "raw_response": analysis.raw_response,
        "sources": sources,
        "sentiment_metrics": metrics,
    }
    if analysis.note_version is not None:
        content["source_note_version"] = analysis.note_version
    payload = {
        "format": "aelo-review-v1",
        "analysis_id": str(analysis.id),
        "patient_id": str(analysis.patient_id),
        "reviewer_id": reviewer_id,
        "decision": decision,
        "comment": comment,
        "content": content,
    }
    checkpoint = getattr(analysis, "vault_checkpoint", None)
    if checkpoint is not None:
        payload["vault_checkpoint_sha256"] = checkpoint.content_sha256
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")


def verify_raw_signature(encoded_public_key: str, encoded_signature: str, payload: bytes) -> bool:
    key, _ = public_key_from_spki(encoded_public_key)
    try:
        signature = base64.b64decode(encoded_signature, validate=True)
    except (ValueError, binascii.Error):
        return False
    if len(signature) != 64:
        return False
    r = int.from_bytes(signature[:32], "big")
    s = int.from_bytes(signature[32:], "big")
    try:
        key.verify(encode_dss_signature(r, s), payload, ec.ECDSA(hashes.SHA256()))
    except InvalidSignature:
        return False
    return True


def verify_validation(validation) -> bool:
    if not validation.signature or not validation.public_key_spki:
        return False
    if validation.analysis.status != validation.decision:
        return False
    payload = signing_payload(
        validation.analysis, decision=validation.decision,
        comment=validation.comment, reviewer_id=validation.reviewed_by_id,
    )
    return (
        hashlib.sha256(payload).hexdigest() == validation.signed_payload_sha256
        and verify_raw_signature(validation.public_key_spki, validation.signature, payload)
    )
