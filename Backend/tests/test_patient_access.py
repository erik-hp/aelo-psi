import pytest
import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from rest_framework.test import APIClient

from apps.ai_analysis.models import AIAnalysis, AnalysisStatus, HumanValidation
from apps.ai_analysis.signatures import verify_validation
from apps.audit_logs.models import AuditLog
def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_read_grant_does_not_allow_clinical_mutations(records):
    client = client_for(records["reader"])
    patient = records["patient"]
    session = records["session"]
    note = records["note"]

    assert client.get(f"/api/patients/{patient.id}/").status_code == 200
    assert client.get(f"/api/sessions/{session.id}/").status_code == 200
    assert client.get(f"/api/clinical-notes/{note.id}/").status_code == 200
    assert client.patch(f"/api/patients/{patient.id}/", {"display_name": "Tampered"}).status_code == 404
    assert client.patch(f"/api/sessions/{session.id}/", {"summary": "Tampered"}).status_code == 404
    assert client.patch(f"/api/clinical-notes/{note.id}/", {"raw_text": "Tampered"}).status_code == 404
    assert client.delete(f"/api/clinical-notes/{note.id}/").status_code == 404
    assert client.post("/api/clinical-notes/", {"patient": str(patient.id), "raw_text": "Tampered"}).status_code == 400
    assert client.post("/api/analysis/request/", {"patient": str(patient.id)}).status_code == 403
    note.refresh_from_db()
    assert note.raw_text == "Original text"


@pytest.mark.django_db
def test_sensitive_reads_are_audited(records):
    client = client_for(records["reader"])
    assert client.get("/api/clinical-notes/").status_code == 200
    note_response = client.get(f"/api/clinical-notes/{records['note'].id}/")
    assert note_response.status_code == 200
    assert note_response["Cache-Control"] == "no-store"
    assert AuditLog.objects.filter(user=records["reader"], action="LIST", metadata__module="clinical_notes").count() >= 1
    assert AuditLog.objects.filter(user=records["reader"], action="READ", entity="ClinicalNote", entity_id=str(records["note"].id)).count() == 1


@pytest.mark.django_db
def test_author_cannot_reassign_clinical_records(records):
    client = client_for(records["owner"])
    other_patient = records["other_patient"]
    session = records["session"]
    note = records["note"]

    assert client.patch(f"/api/sessions/{session.id}/", {"patient": str(other_patient.id)}).status_code == 400
    assert client.patch(f"/api/clinical-notes/{note.id}/", {"patient": str(other_patient.id)}).status_code == 400
    assert client.patch(f"/api/clinical-notes/{note.id}/", {"raw_text": "Revised text"}).status_code == 200
    note.refresh_from_db()
    assert note.version == 2
    assert note.history.count() == 1


@pytest.mark.django_db
def test_other_clinic_cannot_see_patient_records(records):
    client = client_for(records["outsider"])
    assert client.get(f"/api/patients/{records['patient'].id}/").status_code == 404
    assert client.get(f"/api/clinical-notes/{records['note'].id}/").status_code == 404
    assert client.get(f"/api/sessions/{records['session'].id}/").status_code == 404


@pytest.mark.django_db
def test_analysis_can_be_reviewed_only_once(records):
    analysis = AIAnalysis.objects.create(patient=records["patient"], requested_by=records["owner"])
    client = client_for(records["owner"])

    key = ec.generate_private_key(ec.SECP256R1())
    public_der = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    registered = client.post("/api/users/me/signing-key/", {"public_key_spki": base64.b64encode(public_der).decode()})
    assert registered.status_code == 201
    response = client.post(f"/api/analysis/{analysis.id}/signing-payload/", {"decision": "VALIDATED", "comment": "Reviewed"})
    assert response.status_code == 200
    payload = base64.b64decode(response.data["payload"])
    der_signature = key.sign(payload, ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(der_signature)
    signature = base64.b64encode(r.to_bytes(32, "big") + s.to_bytes(32, "big")).decode()

    invalid = client.post(f"/api/analysis/{analysis.id}/validate/", {"comment": "Changed", "signature": signature})
    first = client.post(f"/api/analysis/{analysis.id}/validate/", {"comment": "Reviewed", "signature": signature})
    second = client.post(f"/api/analysis/{analysis.id}/reject/", {"comment": "Changed mind", "signature": signature})

    assert invalid.status_code == 400
    assert first.status_code == 200
    assert second.status_code == 403
    analysis.refresh_from_db()
    assert analysis.status == AnalysisStatus.VALIDATED
    assert HumanValidation.objects.filter(analysis=analysis).count() == 1
    validation = HumanValidation.objects.get(analysis=analysis)
    assert verify_validation(validation)
    AIAnalysis.objects.filter(pk=analysis.pk).update(longitudinal_evolution="tampered")
    analysis.refresh_from_db()
    validation.refresh_from_db()
    assert not verify_validation(validation)
