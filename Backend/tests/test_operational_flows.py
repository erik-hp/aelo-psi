import pytest
from rest_framework.test import APIClient
from apps.patients.models import PatientAccess
from apps.users.models import User, UserRole


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_patient_session_and_note_persist_without_ai(records):
    client = client_for(records["owner"])
    created = client.post("/api/patients/", {"display_name": "Paciente sintetico", "internal_code": "AUDIT-01"})
    assert created.status_code == 201
    patient_id = created.data["id"]
    assert PatientAccess.objects.filter(patient_id=patient_id, user=records["owner"], can_edit=True).exists()
    session = client.post("/api/sessions/", {"patient": patient_id, "scheduled_at": "2030-01-10T12:00:00Z", "summary": "Sessao sintetica"})
    assert session.status_code == 201
    saved = client.post("/api/clinical-notes/", {"patient": patient_id, "session": session.data["id"], "raw_text": "Registro sintetico salvo sem servico de IA."})
    assert saved.status_code == 201
    assert client.get(f"/api/clinical-notes/{saved.data['id']}/").data["raw_text"] == "Registro sintetico salvo sem servico de IA."
    revised = client.patch(f"/api/clinical-notes/{saved.data['id']}/", {"raw_text": "Revisao sintetica explicita."})
    assert revised.status_code == 200
    assert revised.data["version"] == 2
    assert client_for(records["outsider"]).get(f"/api/patients/{patient_id}/").status_code == 404
    assert client_for(records["reader"]).get(f"/api/sessions/{session.data['id']}/").status_code == 404


@pytest.mark.django_db
def test_duplicate_patient_code_is_a_validation_error_scoped_to_clinic(records):
    payload = {"display_name": "Sintetico", "internal_code": records["patient"].internal_code}
    assert client_for(records["owner"]).post("/api/patients/", payload).status_code == 400
    assert client_for(records["outsider"]).post("/api/patients/", payload).status_code == 201


@pytest.mark.django_db
def test_anonymous_and_intern_cannot_create_patients(records):
    payload = {"display_name": "Sintetico", "internal_code": "AUDIT-UNAUTH"}
    assert APIClient().post("/api/patients/", payload).status_code == 401
    intern = User.objects.create_user(username="audit-intern", role=UserRole.INTERN, clinic=records["clinic"])
    assert client_for(intern).post("/api/patients/", payload).status_code == 403


@pytest.mark.django_db
def test_exact_session_conflict_and_cancellation(records):
    client = client_for(records["owner"])
    original = records["session"]
    payload = {"patient": str(records["patient"].id), "scheduled_at": "2026-11-02T12:00:00Z"}
    assert client.post("/api/sessions/", payload).status_code == 400
    cancelled = client.patch(f"/api/sessions/{original.id}/", {"status": "CANCELLED"})
    assert cancelled.status_code == 200
    assert client.post("/api/sessions/", payload).status_code == 201


@pytest.mark.django_db
def test_stale_note_version_is_not_silently_overwritten(records):
    client = client_for(records["owner"])
    url = f"/api/clinical-notes/{records['note'].id}/"
    assert client.patch(url, {"raw_text": "Primeira revisao sintetica", "expected_version": 1}).status_code == 200
    assert client.patch(url, {"raw_text": "Copia desatualizada", "expected_version": 1}).status_code == 409
    records["note"].refresh_from_db()
    assert records["note"].raw_text == "Primeira revisao sintetica"
    assert records["note"].version == 2


@pytest.mark.django_db
def test_eligible_assignees_is_clinic_scoped_role_filtered_and_denies_readonly_or_outsiders(records):
    patient = records["patient"]
    clinic = records["clinic"]
    admin = User.objects.create_user(username="ops-admin", role=UserRole.ADMIN, clinic=clinic)
    intern = User.objects.create_user(username="ops-intern", first_name="Estagiaria", role=UserRole.INTERN, clinic=clinic)
    User.objects.create_user(username="ops-psych", first_name="Psicologa", role=UserRole.PSYCHOLOGIST, clinic=clinic)

    # Admin sees only unassigned psychologists of the same clinic (never interns, admins, or other clinics).
    admin_resp = client_for(admin).get(f"/api/patients/{patient.id}/eligible-assignees/")
    assert admin_resp.status_code == 200
    assert [u["username"] for u in admin_resp.data] == ["ops-psych"]

    # Responsible psychologist sees both unassigned psychologists and interns of the same clinic.
    owner_resp = client_for(records["owner"]).get(f"/api/patients/{patient.id}/eligible-assignees/")
    assert owner_resp.status_code == 200
    assert {u["username"] for u in owner_resp.data} == {"ops-psych", "ops-intern"}
    assert intern.username in {u["username"] for u in owner_resp.data}

    # Read-only psychologist and foreign clinic professional are denied.
    assert client_for(records["reader"]).get(f"/api/patients/{patient.id}/eligible-assignees/").status_code == 403
    assert client_for(records["outsider"]).get(f"/api/patients/{patient.id}/eligible-assignees/").status_code == 404
