"""Synthetic privacy and authorization evidence for the security phase."""

import pytest
from datetime import timedelta
from django.core.management import call_command
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIClient

from apps.clinical_notes.models import ClinicalNoteDraft
from services.security.anonymization import UnsafeClinicalText, prepare_ai_text


def test_synthetic_identifier_corpus_has_no_unblocked_critical_leaks():
    templates = [
        "CPF 123.456.789-00", "CNPJ 12.345.678/0001-90", "RG 12.345.678-9",
        "maria@example.com", "https://example.com/perfil", "(85) 99999-9999",
        "Rua das Flores, 123", "mãe Ana Pereira", "Maria Silva", "P-01",
    ]
    blocked = redacted = 0
    for iteration in range(20):
        for value in templates:
            raw = f"Sessão sintética {iteration}: {value}; relato sem dados reais."
            try:
                prepared = prepare_ai_text(raw, "Maria Silva", "P-01")
            except UnsafeClinicalText:
                blocked += 1
            else:
                assert value.lower() not in prepared.lower()
                redacted += 1
    for iteration in range(80):
        prepared = prepare_ai_text(f"Sessão sintética {iteration}: sono e rotina relatados.")
        assert "sono e rotina" in prepared
    assert blocked + redacted == 200
    assert blocked > 0
    print(f"SYNTHETIC_PRIVACY_METRICS critical=200 redacted={redacted} blocked={blocked} safe_controls=80")


@pytest.mark.django_db
def test_draft_is_encrypted_versioned_and_scoped(records):
    patient = records["patient"]
    path = f"/api/clinical-notes/drafts/{patient.id}/"
    owner = APIClient()
    owner.force_authenticate(records["owner"])
    outsider = APIClient()
    outsider.force_authenticate(records["outsider"])
    reader = APIClient()
    reader.force_authenticate(records["reader"])
    payload = {"title": "Sessão sintética", "content": "Texto clínico sintético confidencial", "version": 0}
    assert outsider.get(path).status_code == 404
    assert reader.put(path, payload, format="json").status_code == 404
    first = owner.put(path, payload, format="json")
    assert first.status_code == 200
    assert first.data["version"] == 1
    assert owner.put(path, payload, format="json").status_code == 409
    assert owner.get(path).data["content"] == payload["content"]
    draft = ClinicalNoteDraft.objects.get(patient=patient, user=records["owner"])
    with connection.cursor() as cursor:
        cursor.execute("SELECT content, title FROM clinical_notes_clinicalnotedraft WHERE id = %s", [draft.pk.hex if connection.vendor == "sqlite" else str(draft.pk)])
        stored = cursor.fetchone()
    assert all(value.startswith("enc:v2:") for value in stored)
    assert owner.delete(path).status_code == 204
    assert owner.get(path).status_code == 404


@pytest.mark.django_db
def test_expired_draft_can_be_replaced_without_waiting_for_purge(records):
    from datetime import timedelta
    from django.utils import timezone

    patient = records["patient"]
    owner = APIClient()
    owner.force_authenticate(records["owner"])
    path = f"/api/clinical-notes/drafts/{patient.id}/"
    draft = ClinicalNoteDraft.objects.create(
        patient=patient, user=records["owner"], title="Antigo", content="Conteúdo expirado",
        version=7, expires_at=timezone.now() - timedelta(days=1),
    )
    assert owner.get(path).status_code == 404
    response = owner.put(path, {"title": "Novo", "content": "Conteúdo novo", "version": 0}, format="json")
    assert response.status_code == 200 and response.data["version"] == 1
    draft.refresh_from_db()
    assert draft.content == "Conteúdo novo"


@pytest.mark.django_db
def test_ai_preview_blocks_unredacted_name_without_echoing_text(records):
    client = APIClient()
    client.force_authenticate(records["owner"])
    response = client.post("/api/clinical-notes/preview-ai/", {
        "patient": str(records["patient"].id), "text": "mãe Ana Pereira relatou melhora"
    })
    assert response.status_code == 422
    assert "Ana Pereira" not in str(response.data)


@pytest.mark.django_db
def test_admin_is_limited_to_own_clinic(records):
    from apps.patients.models import Patient
    from apps.users.models import User, UserRole

    admin = User.objects.create_user(username="admin-local", password="unused", role=UserRole.ADMIN, clinic=records["clinic"])
    other_patient = Patient.objects.create(clinic=records["other_clinic"], internal_code="B-1", display_name="Synthetic B", created_by=records["outsider"])
    client = APIClient()
    client.force_authenticate(admin)
    assert client.get(f"/api/patients/{records['patient'].id}/").status_code == 200
    assert client.get(f"/api/patients/{other_patient.id}/").status_code == 404
    users = client.get("/api/users/")
    assert users.status_code == 200
    assert all(str(item["clinic"]) == str(records["clinic"].id) for item in users.data["results"])
    assert client.get(f"/api/users/{records['outsider'].id}/").status_code == 404
    assert client.get("/admin/").status_code == 404


@pytest.mark.django_db
def test_ai_boundary_blocks_identifiers_before_network_request(records, monkeypatch):
    from apps.ai_analysis.services import request_ai_analysis
    from apps.ai_analysis.vault import create_checkpoint
    from apps.ai_analysis.models import AIAnalysis

    note = records["note"]
    note.raw_text = "mãe Ana Pereira relatou melhora"
    note.save(update_fields=["raw_text"])
    calls = []
    monkeypatch.setattr("services.ai.client.AIClient.request_analysis", lambda *args: calls.append("analysis"))
    monkeypatch.setattr("services.ai.client.AIClient.request_vault", lambda *args: calls.append("vault"))
    with pytest.raises(UnsafeClinicalText):
        request_ai_analysis(patient=records["patient"], note=note, user=records["owner"], context_limit=10)
    analysis = AIAnalysis.objects.create(patient=records["patient"], note=note, note_version=note.version, requested_by=records["owner"])
    with pytest.raises(UnsafeClinicalText):
        create_checkpoint(analysis)
    assert calls == []


@pytest.mark.django_db
def test_vault_worker_rechecks_revoked_access(records, monkeypatch):
    from apps.ai_analysis.jobs import process_next_job
    from apps.ai_analysis.models import AIAnalysis, VaultJob
    from apps.patients.models import PatientAccess

    editor = records["editor"]
    note = records["note"]
    analysis = AIAnalysis.objects.create(patient=records["patient"], note=note, note_version=note.version, requested_by=editor)
    job = VaultJob.objects.create(analysis=analysis)
    PatientAccess.objects.filter(patient=records["patient"], user=editor).delete()
    calls = []
    monkeypatch.setattr("apps.ai_analysis.jobs.create_checkpoint", lambda _: calls.append("called"))
    assert process_next_job() is True
    job.refresh_from_db()
    assert job.status == VaultJob.Status.FAILED
    assert job.error_code == "PermissionError"
    assert calls == []


@pytest.mark.django_db
def test_expired_draft_is_purged(records):
    draft = ClinicalNoteDraft.objects.create(
        patient=records["patient"], user=records["owner"], title="Synthetic",
        content="Synthetic draft", expires_at=timezone.now() - timedelta(seconds=1),
    )
    call_command("purge_expired_drafts", verbosity=0)
    assert not ClinicalNoteDraft.objects.filter(pk=draft.pk).exists()
