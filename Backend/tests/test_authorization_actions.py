"""F0-02: lists, mutations, delegation, signed reviews and checkpoint export."""

import base64

import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from rest_framework.test import APIClient

from apps.ai_analysis.models import AIAnalysis, AnalysisStatus, HumanValidation, VaultCheckpoint
from apps.clinical_notes.models import ClinicalNote
from apps.patients.models import PatientAccess
from apps.therapy_sessions.models import TherapySession
from apps.users.models import User, UserRole


ACTORS = ["owner", "reader", "editor", "intern", "admin", "ungranted", "revoked", "outsider", "anonymous"]


def authenticated(user):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.fixture
def populated_scope(records, clinical_scope, foreign_records):
    actors, paths = clinical_scope
    other = records["other_patient"]
    session = TherapySession.objects.create(patient=other, professional=records["owner"], scheduled_at="2026-11-04T12:00:00Z")
    ClinicalNote.objects.create(patient=other, session=session, author=records["owner"], raw_text="OTHER-PATIENT-SYNTHETIC")
    AIAnalysis.objects.create(patient=other, note=other.clinical_notes.get(), requested_by=records["owner"])
    AIAnalysis.objects.create(patient=foreign_records["patient"], note=foreign_records["note"], requested_by=records["outsider"])
    return actors, paths


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint", ["patients", "sessions", "clinical-notes", "analysis"])
@pytest.mark.parametrize("actor", ACTORS)
def test_list_counts_and_payloads_stay_inside_scope(records, populated_scope, actor, endpoint):
    actors, _ = populated_scope
    response = authenticated(actors[actor]).get(f"/api/{endpoint}/")
    if actor == "anonymous":
        assert response.status_code == 401
        return
    assert response.status_code == 200
    body = response.json()
    expected_count = 2 if actor in {"owner", "editor"} else 1 if actor in {"reader", "intern"} else 0
    if endpoint == "patients" and actor == "admin":
        expected_count = 2  # Registration directory is not clinical access.
    assert body["count"] == expected_count
    assert len(body["results"]) == expected_count
    allowed_ids = {str(records["patient"].pk), str(records["other_patient"].pk)}
    if actor in {"reader", "intern"}:
        allowed_ids = {str(records["patient"].pk)}
    for row in body["results"]:
        assert row["id" if endpoint == "patients" else "patient"] in allowed_ids
    assert b"FOREIGN-SYNTHETIC" not in response.content
    if actor not in {"owner", "editor"}:
        assert b"OTHER-PATIENT-SYNTHETIC" not in response.content


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint", ["sessions", "clinical-notes", "analysis"])
@pytest.mark.parametrize("actor", ["owner", "reader", "editor", "intern"])
def test_patient_filter_returns_only_requested_authorized_records(records, populated_scope, endpoint, actor):
    actors, _ = populated_scope
    response = authenticated(actors[actor]).get(f"/api/{endpoint}/", {"patient": str(records["patient"].pk)})
    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.json()["results"][0]["patient"] == str(records["patient"].pk)


@pytest.mark.django_db
@pytest.mark.parametrize("resource", ["note", "session"])
@pytest.mark.parametrize("method", ["patch", "delete"])
@pytest.mark.parametrize("actor", ACTORS)
def test_mutations_require_write_grant_and_authorship(records, clinical_scope, resource, method, actor):
    actors, paths = clinical_scope
    client = authenticated(actors[actor])
    payload = {"raw_text": "REVISED-SYNTHETIC"} if resource == "note" else {"summary": "REVISED-SYNTHETIC"}
    response = getattr(client, method)(paths[resource], payload, format="json")
    expected = (200 if method == "patch" else 204) if actor == "owner" else 401 if actor == "anonymous" else 404
    assert response.status_code == expected
    obj = records[resource]
    obj.refresh_from_db()
    if actor != "owner":
        assert obj.deleted_at is None
        assert (obj.raw_text if resource == "note" else obj.summary) != "REVISED-SYNTHETIC"


@pytest.mark.django_db
@pytest.mark.parametrize("actor", ACTORS)
def test_grant_and_revoke_require_delegation_permission(records, clinical_scope, actor):
    actors, _ = clinical_scope
    beneficiary = User.objects.create_user(username="beneficiary", role=UserRole.PSYCHOLOGIST, clinic=records["clinic"])
    path = f"/api/patients/{records['patient'].pk}"
    client = authenticated(actors[actor])
    response = client.post(f"{path}/grant-access/", {"user": beneficiary.pk, "can_edit": False}, format="json")
    if actor in {"owner", "editor"}:
        assert response.status_code == 201
        assert authenticated(beneficiary).get(f"/api/clinical-notes/{records['note'].pk}/").status_code == 200
        assert client.post(f"{path}/revoke-access/", {"user": beneficiary.pk}, format="json").status_code == 204
        assert authenticated(beneficiary).get(f"/api/clinical-notes/{records['note'].pk}/").status_code == 404
    else:
        expected = 401 if actor == "anonymous" else 403 if actor == "admin" else 404
        assert response.status_code == expected
        assert not PatientAccess.objects.filter(patient=records["patient"], user=beneficiary).exists()


@pytest.mark.django_db
@pytest.mark.parametrize("actor", ACTORS)
def test_revoke_cannot_remove_a_grant_without_permission(records, clinical_scope, actor):
    actors, _ = clinical_scope
    beneficiary = User.objects.create_user(username="granted-beneficiary", role=UserRole.PSYCHOLOGIST, clinic=records["clinic"])
    grant = PatientAccess.objects.create(patient=records["patient"], user=beneficiary, granted_by=records["owner"])
    response = authenticated(actors[actor]).post(
        f"/api/patients/{records['patient'].pk}/revoke-access/", {"user": beneficiary.pk}, format="json",
    )
    expected = 204 if actor in {"owner", "editor"} else 401 if actor == "anonymous" else 403 if actor == "admin" else 404
    assert response.status_code == expected
    assert PatientAccess.objects.filter(pk=grant.pk).exists() is (actor not in {"owner", "editor"})


@pytest.mark.django_db
@pytest.mark.parametrize("actor", ACTORS)
@pytest.mark.parametrize("endpoint", ["users", "audit-logs"])
def test_staff_and_audit_lists_require_operational_administration(clinical_scope, actor, endpoint):
    actors, _ = clinical_scope
    response = authenticated(actors[actor]).get(f"/api/{endpoint}/")
    assert response.status_code == (200 if actor == "admin" else 401 if actor == "anonymous" else 403)
    if actor == "admin" and endpoint == "users":
        ids = {row["id"] for row in response.json()["results"]}
        assert actors["outsider"].pk not in ids
        assert actors["admin"].pk not in ids


def register_key(client):
    key = ec.generate_private_key(ec.SECP256R1())
    public = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    assert client.post("/api/users/me/signing-key/", {"public_key_spki": base64.b64encode(public).decode()}).status_code == 201
    return key


def sign_review(client, key, analysis, decision="VALIDATED"):
    response = client.post(f"/api/analysis/{analysis.pk}/signing-payload/", {"decision": decision, "comment": "Synthetic review"})
    assert response.status_code == 200
    payload = base64.b64decode(response.data["payload"])
    r, s = decode_dss_signature(key.sign(payload, ec.ECDSA(hashes.SHA256())))
    return {"comment": "Synthetic review", "signature": base64.b64encode(r.to_bytes(32, "big") + s.to_bytes(32, "big")).decode()}


@pytest.mark.django_db
@pytest.mark.parametrize("actor", ACTORS)
def test_review_requires_professional_write_grant_and_matching_signature(records, clinical_scope, actor):
    actors, _ = clinical_scope
    analysis = AIAnalysis.objects.get(note=records["note"])
    client = authenticated(actors[actor])
    path = f"/api/analysis/{analysis.pk}"
    if actor in {"owner", "editor"}:
        key = register_key(client)
        data = sign_review(client, key, analysis)
        assert client.post(f"{path}/validate/", data).status_code == 200
        assert client.post(f"{path}/reject/", data).status_code == 403
        assert HumanValidation.objects.get(analysis=analysis).reviewed_by_id == actors[actor].pk
    else:
        expected = 401 if actor == "anonymous" else 403 if actor in {"reader", "intern", "admin"} else 404
        assert client.post(f"{path}/signing-payload/", {"decision": "VALIDATED"}).status_code == expected
        assert client.post(f"{path}/validate/", {"signature": "invalid"}).status_code == expected
        assert not HumanValidation.objects.filter(analysis=analysis).exists()
        analysis.refresh_from_db()
        assert analysis.status == AnalysisStatus.PENDING_REVIEW


@pytest.mark.django_db
@pytest.mark.parametrize("actor", ACTORS)
def test_download_requires_patient_scope_and_verified_review(records, clinical_scope, actor):
    actors, paths = clinical_scope
    owner_client = authenticated(records["owner"])
    key = register_key(owner_client)
    analysis = AIAnalysis.objects.get(note=records["note"])
    data = sign_review(owner_client, key, analysis)
    assert owner_client.post(f"/api/analysis/{analysis.pk}/validate/", data).status_code == 200
    client = authenticated(actors[actor])
    response = client.get(paths["checkpoint"], {"download": "1"})
    if actor in {"owner", "reader", "editor", "intern"}:
        assert response.status_code == 200
        assert response.content == b"Synthetic checkpoint evidence"
        assert response["Cache-Control"] == "no-store"
    else:
        assert response.status_code == (401 if actor == "anonymous" else 404)
        assert b"Synthetic checkpoint evidence" not in response.content


@pytest.mark.django_db
@pytest.mark.parametrize("tamper", ["markdown", "hash", "analysis", "signature"])
def test_download_refuses_tampering_after_review(records, clinical_scope, tamper):
    _, paths = clinical_scope
    client = authenticated(records["owner"])
    key = register_key(client)
    analysis = AIAnalysis.objects.get(note=records["note"])
    assert client.post(f"/api/analysis/{analysis.pk}/validate/", sign_review(client, key, analysis)).status_code == 200
    checkpoint = VaultCheckpoint.objects.get(analysis=analysis)
    if tamper == "markdown":
        checkpoint.markdown = "CHANGED-SYNTHETIC"
        checkpoint.save(update_fields=["markdown"])
    elif tamper == "hash":
        checkpoint.content_sha256 = "0" * 64
        checkpoint.save(update_fields=["content_sha256"])
    elif tamper == "analysis":
        analysis.longitudinal_evolution = "CHANGED-SYNTHETIC"
        analysis.save(update_fields=["longitudinal_evolution"])
    else:
        validation = HumanValidation.objects.get(analysis=analysis)
        validation.signature = "invalid"
        validation.save(update_fields=["signature"])
    response = client.get(paths["checkpoint"], {"download": "1"})
    assert response.status_code == 403
    assert b"Synthetic checkpoint evidence" not in response.content
    assert b"CHANGED-SYNTHETIC" not in response.content


@pytest.mark.django_db
@pytest.mark.parametrize("decision", ["VALIDATED", "REJECTED"])
def test_review_signature_cannot_be_replayed_for_another_analysis(records, clinical_scope, decision):
    client = authenticated(records["owner"])
    key = register_key(client)
    source = AIAnalysis.objects.get(note=records["note"])
    target = AIAnalysis.objects.create(patient=records["patient"], requested_by=records["owner"])
    data = sign_review(client, key, source, decision)
    action = "validate" if decision == "VALIDATED" else "reject"
    assert client.post(f"/api/analysis/{target.pk}/{action}/", data).status_code == 400
    assert not HumanValidation.objects.filter(analysis=target).exists()
    target.refresh_from_db()
    assert target.status == AnalysisStatus.PENDING_REVIEW
    assert client.post(f"/api/analysis/{source.pk}/{action}/", data).status_code == 200
