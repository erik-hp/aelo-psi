"""F0: busca no servidor e corridas de cadastro/agenda resolvidas pelo banco."""
from unittest import mock

import pytest
from django.db import IntegrityError
from rest_framework.test import APIClient

from apps.patients.serializers import PatientSerializer
from apps.therapy_sessions.models import TherapySession
from apps.therapy_sessions.serializers import TherapySessionSerializer


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def test_patient_search_filters_on_server(records):
    response = client_for(records["owner"]).get("/api/patients/", {"search": "P-2"})
    assert response.status_code == 200
    assert [row["internal_code"] for row in response.data["results"]] == ["P-2"]


def test_session_slot_constraint_rejects_duplicate(records):
    with pytest.raises(IntegrityError):
        TherapySession.objects.create(
            patient=records["other_patient"], professional=records["owner"],
            scheduled_at=records["session"].scheduled_at,
        )


def test_cancelled_session_frees_slot(records):
    records["session"].status = "CANCELLED"
    records["session"].save(update_fields=["status"])
    TherapySession.objects.create(
        patient=records["other_patient"], professional=records["owner"],
        scheduled_at=records["session"].scheduled_at,
    )


def test_session_race_returns_400(records):
    # Simula a janela da corrida: a checagem do serializer não vê o concorrente.
    with mock.patch.object(TherapySessionSerializer, "validate", lambda self, attrs: attrs):
        response = client_for(records["owner"]).post("/api/sessions/", {
            "patient": records["other_patient"].pk, "scheduled_at": "2026-11-02T12:00:00Z",
        }, format="json")
    assert response.status_code == 400
    assert "scheduled_at" in response.data


def test_patient_duplicate_race_returns_400(records):
    with mock.patch.object(PatientSerializer, "validate_internal_code", lambda self, value: value), \
            mock.patch.object(PatientSerializer, "get_validators", lambda self: []):
        response = client_for(records["owner"]).post("/api/patients/", {
            "internal_code": "P-1", "display_name": "Duplicado",
        }, format="json")
    assert response.status_code == 400
    assert "internal_code" in response.data


def test_overlapping_session_interval_rejected_while_adjacent_slot_succeeds(records):
    client = client_for(records["owner"])
    overlap = client.post("/api/sessions/", {
        "patient": records["other_patient"].pk,
        "scheduled_at": "2026-11-02T12:20:00Z",
    }, format="json")
    assert overlap.status_code == 400
    assert "scheduled_at" in overlap.data

    bad_end = client.post("/api/sessions/", {
        "patient": records["other_patient"].pk,
        "scheduled_at": "2026-11-02T14:00:00Z",
        "ended_at": "2026-11-02T13:50:00Z",
    }, format="json")
    assert bad_end.status_code == 400
    assert "ended_at" in bad_end.data

    adjacent = client.post("/api/sessions/", {
        "patient": records["other_patient"].pk,
        "scheduled_at": "2026-11-02T12:50:00Z",
    }, format="json")
    assert adjacent.status_code == 201
