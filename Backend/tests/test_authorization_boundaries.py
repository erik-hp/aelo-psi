"""Adversarial relation inputs, HTML selectors and filter existence oracles."""

from uuid import uuid4

import pytest
from rest_framework.test import APIClient



def authenticated(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint", ["clinical-notes", "sessions", "analysis"])
def test_browsable_forms_never_disclose_other_clinic_patients(records, foreign_records, endpoint):
    response = authenticated(records["owner"]).get(f"/api/{endpoint}/", HTTP_ACCEPT="text/html")
    assert response.status_code == 200
    assert b"text/html" in response["Content-Type"].encode()
    assert b"FOREIGN-SYNTHETIC-SECRET" not in response.content
    assert b"FOREIGN-SYNTHETIC" not in response.content


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint", ["clinical-notes", "sessions"])
def test_read_only_grant_does_not_populate_write_selectors(records, endpoint):
    response = authenticated(records["reader"]).get(f"/api/{endpoint}/", HTTP_ACCEPT="text/html")
    assert response.status_code == 200
    # The readable first patient can be shown in results. The second patient,
    # to whom this professional has no grant, must not enter any HTML form.
    assert str(records["other_patient"].pk).encode() not in response.content


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint", ["clinical-notes", "sessions", "analysis"])
def test_filters_reject_ungranted_same_clinic_patient_like_missing_id(records, endpoint):
    client = authenticated(records["reader"])
    existing = client.get(f"/api/{endpoint}/", {"patient": str(records["other_patient"].pk)})
    missing = client.get(f"/api/{endpoint}/", {"patient": str(uuid4())})
    assert existing.status_code == missing.status_code == 400
    assert existing.data == missing.data


@pytest.mark.django_db
@pytest.mark.parametrize("actor", ["owner", "reader"])
def test_note_session_relation_does_not_reveal_foreign_session(records, foreign_records, actor):
    client = authenticated(records[actor])
    payload = {"patient": str(records["patient"].pk), "session": str(foreign_records["session"].pk), "raw_text": "Synthetic"}
    existing = client.post("/api/clinical-notes/", payload, format="json")
    payload["session"] = str(uuid4())
    missing = client.post("/api/clinical-notes/", payload, format="json")
    assert existing.status_code == missing.status_code == 400
    assert str(existing.data).replace(str(foreign_records["session"].pk), "ID") == str(missing.data).replace(payload["session"], "ID")


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint", ["clinical-notes", "sessions"])
@pytest.mark.parametrize("actor", ["owner", "reader"])
def test_create_relations_do_not_reveal_foreign_patient_existence(records, foreign_records, endpoint, actor):
    client = authenticated(records[actor])
    payload = {"patient": str(foreign_records["patient"].pk), "raw_text": "Synthetic", "scheduled_at": "2026-11-04T12:00:00Z"}
    existing = client.post(f"/api/{endpoint}/", payload, format="json")
    payload["patient"] = str(uuid4())
    missing = client.post(f"/api/{endpoint}/", payload, format="json")
    assert existing.status_code == missing.status_code == 400
    # The standard invalid-PK error can contain the input ID. Normalize just
    # that caller-supplied value; status and all other details must match.
    assert str(existing.data).replace(str(foreign_records["patient"].pk), "ID") == str(missing.data).replace(payload["patient"], "ID")


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint,field,target", [
    ("clinical-notes", "patient", "patient"),
    ("clinical-notes", "session", "session"),
    ("sessions", "patient", "patient"),
    ("analysis", "patient", "patient"),
])
def test_filter_does_not_reveal_foreign_object_existence(records, foreign_records, endpoint, field, target):
    client = authenticated(records["owner"])
    existing = client.get(f"/api/{endpoint}/", {field: str(foreign_records[target].pk)})
    missing = client.get(f"/api/{endpoint}/", {field: str(uuid4())})
    assert existing.status_code == missing.status_code == 400
    assert existing.data == missing.data


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint,field", [("users", "clinic"), ("audit-logs", "user")])
def test_operational_filters_do_not_enumerate_other_clinics(records, clinical_scope, endpoint, field):
    actors, _ = clinical_scope
    client = authenticated(actors["admin"])
    hidden = records["other_clinic"].pk if field == "clinic" else records["outsider"].pk
    missing_id = uuid4() if field == "clinic" else 99999999
    existing = client.get(f"/api/{endpoint}/", {field: str(hidden)})
    missing = client.get(f"/api/{endpoint}/", {field: str(missing_id)})
    assert existing.status_code == missing.status_code == 400
    assert existing.data == missing.data
