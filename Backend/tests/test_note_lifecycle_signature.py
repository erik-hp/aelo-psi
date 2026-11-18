"""F1-03 & F5-02: Clinical note lifecycle (DRAFT -> IN_REVIEW -> SIGNED -> AMENDED), ECDSA P-256 signature, and FHIR Provenance."""
import base64
import hashlib

import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from rest_framework.test import APIClient

from apps.audit_logs.models import AuditLog
from apps.clinical_notes.models import ClinicalNoteHistory, NoteStatus
from apps.clinical_notes.signatures import verify_note_signature
from apps.patients.models import PatientAccess
from apps.users.models import User, UserRole, UserSigningKey


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def register_p256_key(user):
    private_key = ec.generate_private_key(ec.SECP256R1())
    der = private_key.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    encoded_pub = base64.b64encode(der).decode("ascii")
    UserSigningKey.objects.update_or_create(
        user=user,
        defaults={"public_key_spki": encoded_pub, "fingerprint": hashlib.sha256(der).hexdigest()},
    )
    return private_key


def sign_raw_p256(private_key, payload_b64: str) -> str:
    payload = base64.b64decode(payload_b64)
    der_sig = private_key.sign(payload, ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(der_sig)
    raw = r.to_bytes(32, "big") + s.to_bytes(32, "big")
    return base64.b64encode(raw).decode("ascii")


@pytest.mark.django_db
def test_note_sign_lock_amend_history_and_fhir_provenance(records):
    owner = records["owner"]
    note = records["note"]
    patient = records["patient"]
    private_key = register_p256_key(owner)
    client = client_for(owner)

    # Before signing, official_only=1 excludes preliminary draft notes (F5-02).
    fhir_draft_blocked = client.get(f"/api/patients/{patient.id}/fhir/?official_only=1")
    assert fhir_draft_blocked.status_code == 200
    assert not any(
        entry["resource"]["resourceType"] == "DocumentReference"
        for entry in fhir_draft_blocked.json()["entry"]
    )

    # 1. Submit to review (DRAFT -> IN_REVIEW)
    review_resp = client.post(f"/api/clinical-notes/{note.id}/submit-review/")
    assert review_resp.status_code == 200
    assert review_resp.data["status"] == NoteStatus.IN_REVIEW

    # 2. Obtain signing payload & sign (IN_REVIEW -> SIGNED)
    payload_resp = client.post(f"/api/clinical-notes/{note.id}/signing-payload/", {"action": "SIGN"}, format="json")
    assert payload_resp.status_code == 200
    sig = sign_raw_p256(private_key, payload_resp.data["payload"])

    # Tampered signature must fail explicitly
    bad_sig = base64.b64encode(b"\x01" * 64).decode("ascii")
    assert client.post(f"/api/clinical-notes/{note.id}/sign/", {"signature": bad_sig}, format="json").status_code == 400

    sign_resp = client.post(f"/api/clinical-notes/{note.id}/sign/", {"signature": sig}, format="json")
    assert sign_resp.status_code == 200
    assert sign_resp.data["status"] == NoteStatus.SIGNED
    assert sign_resp.data["locked_at"] is not None
    note.refresh_from_db()
    assert verify_note_signature(note) is True

    # 3. Signed note blocks PATCH and DELETE
    assert client.patch(f"/api/clinical-notes/{note.id}/", {"raw_text": "Silent edit"}, format="json").status_code == 403
    assert client.delete(f"/api/clinical-notes/{note.id}/").status_code == 403
    note.refresh_from_db()
    assert note.raw_text == "Original text"

    # 4. Formal rectification (SIGNED -> AMENDED) preserves signed history and encrypts reason
    rectified_text = "Original text + retificação sintética documentada na sessão seguinte."
    reason = "Complementação formal de informação relatada pelo paciente."
    amend_payload = client.post(
        f"/api/clinical-notes/{note.id}/signing-payload/",
        {"action": "AMEND", "raw_text": rectified_text, "reason": reason},
        format="json",
    )
    assert amend_payload.status_code == 200
    amend_sig = sign_raw_p256(private_key, amend_payload.data["payload"])

    # Replay of original SIGN signature on AMEND must fail
    assert client.post(
        f"/api/clinical-notes/{note.id}/amend/",
        {"raw_text": rectified_text, "reason": reason, "signature": sig},
        format="json",
    ).status_code == 400

    amend_resp = client.post(
        f"/api/clinical-notes/{note.id}/amend/",
        {"raw_text": rectified_text, "reason": reason, "signature": amend_sig},
        format="json",
    )
    assert amend_resp.status_code == 200
    assert amend_resp.data["status"] == NoteStatus.AMENDED
    assert amend_resp.data["version"] == 2
    note.refresh_from_db()
    assert verify_note_signature(note, reason=reason) is True

    archived = ClinicalNoteHistory.objects.get(note=note, version=1)
    assert archived.raw_text == "Original text"
    assert archived.status_at_archive == NoteStatus.SIGNED
    assert archived.amendment_reason == reason

    # Audit log never leaks clinical text or amendment reason
    logs = list(AuditLog.objects.filter(entity_id=str(note.id)).values_list("action", "metadata"))
    actions = {action for action, _ in logs}
    assert {"NOTE_SUBMIT_REVIEW", "NOTE_SIGNED", "NOTE_AMENDED"}.issubset(actions)
    for _, meta in logs:
        assert "Complementação" not in str(meta)
        assert "Original text" not in str(meta)

    # Authorized reader can inspect history; outsider gets 404
    hist_resp = client_for(records["reader"]).get(f"/api/clinical-notes/{note.id}/history/")
    assert hist_resp.status_code == 200
    assert len(hist_resp.data) == 1
    assert hist_resp.data[0]["amendment_reason"] == reason
    assert client_for(records["outsider"]).get(f"/api/clinical-notes/{note.id}/history/").status_code == 404

    # 5. FHIR export with official_only=1 includes amended DocumentReference + Provenance
    fhir_official = client.get(f"/api/patients/{patient.id}/fhir/?official_only=1").json()
    types = {entry["resource"]["resourceType"] for entry in fhir_official["entry"]}
    assert types == {"Patient", "Encounter", "DocumentReference", "Provenance"}
    doc_ref = next(e["resource"] for e in fhir_official["entry"] if e["resource"]["resourceType"] == "DocumentReference")
    assert doc_ref["docStatus"] == "amended"


@pytest.mark.django_db
def test_other_clinician_intern_and_admin_cannot_sign_or_amend_note(records):
    note = records["note"]
    patient = records["patient"]
    intern = User.objects.create_user(username="intern-sig", role=UserRole.INTERN, clinic=patient.clinic)
    admin = User.objects.create_user(username="admin-sig", role=UserRole.ADMIN, clinic=patient.clinic)
    PatientAccess.objects.create(patient=patient, user=intern, can_edit=False, granted_by=records["owner"])

    for actor in (records["editor"], records["reader"], intern, admin, records["outsider"]):
        c = client_for(actor)
        assert c.post(f"/api/clinical-notes/{note.id}/submit-review/").status_code in {403, 404}
        assert c.post(f"/api/clinical-notes/{note.id}/sign/", {"signature": "x"}, format="json").status_code in {403, 404}
        assert c.post(
            f"/api/clinical-notes/{note.id}/amend/",
            {"raw_text": "x", "reason": "motivo sintetico suficiente", "signature": "x"},
            format="json",
        ).status_code in {403, 404}
