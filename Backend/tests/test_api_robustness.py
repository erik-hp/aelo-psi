"""Malformed input, pagination stability and audit accuracy on synthetic records."""
from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.audit_logs.models import AuditLog
from apps.audit_logs.views import AuditLogViewSet
from apps.clinical_notes.models import ClinicalNote
from apps.patients.models import Patient, PatientAccess
from apps.therapy_sessions.models import TherapySession
from apps.users.models import User, UserRole

MALFORMED_IDS = ["nao-e-um-id", {"a": 1}, ["x"]]


def client_for(user):
    client = APIClient(raise_request_exception=False)
    client.force_authenticate(user=user)
    return client


def walk_pages(client, path):
    ids, page = [], 1
    while True:
        body = client.get(path, {"page": page}).json()
        ids.extend(row["id"] for row in body["results"])
        if not body["next"]:
            return ids
        page += 1


def add_patients(records, total):
    owner = records["owner"]
    for number in range(total):
        # Identical names force the tie-breaker that keeps page boundaries stable.
        patient = Patient.objects.create(
            clinic=owner.clinic, internal_code=f"SINT-{number:03}", display_name="Paciente sintetico", created_by=owner,
        )
        PatientAccess.objects.create(patient=patient, user=owner, can_edit=True, granted_by=owner)


@pytest.mark.django_db
@pytest.mark.parametrize("malformed", MALFORMED_IDS)
@pytest.mark.parametrize("action", ["grant-access", "revoke-access"])
def test_patient_access_actions_reject_malformed_user_ids(records, action, malformed):
    client = client_for(records["owner"])
    response = client.post(f"/api/patients/{records['patient'].id}/{action}/", {"user": malformed}, format="json")
    assert response.status_code == 404


@pytest.mark.django_db
@pytest.mark.parametrize("malformed", MALFORMED_IDS)
def test_ai_preview_rejects_malformed_patient_ids(records, malformed):
    client = client_for(records["owner"])
    response = client.post("/api/clinical-notes/preview-ai/", {"patient": malformed, "text": "Texto sintetico"}, format="json")
    assert response.status_code == 404


@pytest.mark.django_db
def test_dashboard_rejects_malformed_patient_filter(records):
    assert client_for(records["owner"]).get("/api/dashboard/longitudinal", {"patient": "abc"}).status_code == 400


@pytest.mark.django_db
def test_dashboard_filter_still_scopes_to_authorized_patient(records):
    client = client_for(records["owner"])
    allowed = client.get("/api/dashboard/longitudinal", {"patient": str(records["patient"].id)})
    assert allowed.status_code == 200
    assert allowed.json()["patients"] == 1
    outsider = client_for(records["outsider"]).get("/api/dashboard/longitudinal", {"patient": str(records["patient"].id)})
    assert outsider.status_code == 200
    assert outsider.json()["patients"] == 0


@pytest.mark.django_db
def test_patient_pages_cover_every_record_once(records):
    add_patients(records, 60)
    client = client_for(records["owner"])
    ids = walk_pages(client, "/api/patients/")
    assert len(ids) == client.get("/api/patients/").json()["count"]
    assert len(set(ids)) == len(ids)


@pytest.mark.django_db
def test_session_pages_cover_every_record_once(records):
    owner, patient = records["owner"], records["patient"]
    when = timezone.now() + timedelta(days=1)
    for offset in range(30):
        # Equal timestamps are possible for cancelled slots and need a tie-breaker.
        TherapySession.objects.create(patient=patient, professional=owner, scheduled_at=when, status="CANCELLED" if offset else "SCHEDULED")
    client = client_for(owner)
    ids = walk_pages(client, "/api/sessions/")
    assert len(ids) == client.get("/api/sessions/").json()["count"]
    assert len(set(ids)) == len(ids)


@pytest.mark.django_db
def test_audit_list_follows_the_chain_sequence(records):
    # created_at can tie; the unique chain sequence is the only total order.
    admin = User.objects.create_user(username="admin", password="unused", role=UserRole.ADMIN, clinic=records["clinic"])
    view = AuditLogViewSet()
    view.request = SimpleNamespace(user=admin)
    assert view.get_queryset().query.order_by == ("-sequence",)


@pytest.mark.django_db
def test_note_list_and_detail_write_exactly_one_audit_event(records):
    owner, patient = records["owner"], records["patient"]
    note = ClinicalNote.objects.create(patient=patient, author=owner, raw_text="Texto sintetico")
    client = client_for(owner)

    before = AuditLog.objects.filter(action="LIST").count()
    assert client.get("/api/clinical-notes/").status_code == 200
    assert AuditLog.objects.filter(action="LIST").count() == before + 1

    before = AuditLog.objects.filter(action="READ").count()
    assert client.get(f"/api/clinical-notes/{note.id}/").status_code == 200
    assert AuditLog.objects.filter(action="READ").count() == before + 1
    assert AuditLog.objects.filter(action="READ").order_by("-sequence").first().metadata["method"] == "GET"
