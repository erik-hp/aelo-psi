"""Automatic note reading, allowed only in environments declared synthetic."""
from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai_analysis.jobs import process_next_extraction_job
from apps.ai_analysis.models import AIAnalysis, NoteExtractionJob, VaultEdge, VaultJob, VaultNode
from apps.ai_analysis.services import build_context
from apps.ai_analysis.vault import create_checkpoint
from apps.ai_analysis.vault_core.services import extract_note_graph, persist_note_graph
from apps.clinical_notes.models import ClinicalNote
from apps.patients.models import Patient
from services.ai.client import AIClient, AIServiceError

pytestmark = pytest.mark.django_db

ORIGINAL = "Relato sintético sobre luto pelo avô."
EDITED = "Relato sintético sobre mudança de cidade."


def extraction_of(source, target):
    def fake(_self, payload):
        linked = f"{source} pelo {target}"
        evidence = linked if linked in payload["note"]["text"] else f"{source} de {target}"
        return {
            "nodes": [
                {"kind": "event", "label": source, "evidence": source, "embedding": None},
                {"kind": "context", "label": target, "evidence": target, "embedding": None},
            ],
            "edges": [{"source": 0, "target": 1, "relation": "associated", "evidence": evidence, "confidence": 0.8}],
        }
    return fake


def forbid_ai(_self, _payload):
    raise AssertionError("The HTTP request must not reach the AI service.")


def unavailable(_self, _payload):
    raise AIServiceError()


@pytest.fixture
def client(records):
    api = APIClient()
    api.force_authenticate(user=records["owner"])
    return api


@pytest.fixture
def automatic(settings, monkeypatch):
    settings.AI_AUTO_EXTRACTION = True
    monkeypatch.setattr(AIClient, "request_vault", forbid_ai)


def create_note(client, records, text=ORIGINAL):
    response = client.post("/api/clinical-notes/", {"patient": str(records["patient"].id), "raw_text": text}, format="json")
    assert response.status_code == 201
    return response.data["id"]


def run_extraction(monkeypatch, source="luto", target="avô"):
    monkeypatch.setattr(AIClient, "request_vault", extraction_of(source, target))
    return process_next_extraction_job()


def test_saving_a_note_queues_nothing_by_default(records, client):
    create_note(client, records)
    assert not NoteExtractionJob.objects.exists()


def test_saving_a_note_queues_one_job_per_version(records, client, automatic):
    note_id = create_note(client, records)
    assert NoteExtractionJob.objects.filter(note_id=note_id, note_version=1).count() == 1
    client.patch(f"/api/clinical-notes/{note_id}/", {"raw_text": EDITED}, format="json")
    assert NoteExtractionJob.objects.filter(note_id=note_id, note_version=2).count() == 1


def test_worker_builds_the_graph_without_locking_the_note(records, client, automatic, monkeypatch):
    note_id = create_note(client, records)
    assert run_extraction(monkeypatch)
    assert NoteExtractionJob.objects.get(note_id=note_id).status == VaultJob.Status.COMPLETED
    assert VaultEdge.objects.filter(note_id=note_id).count() == 1
    assert ClinicalNote.objects.get(pk=note_id).locked_at is None


def test_empty_queue_reports_no_work(records):
    assert process_next_extraction_job() is False


def test_reading_the_same_version_again_does_not_duplicate(records, client, automatic, monkeypatch):
    note_id = create_note(client, records)
    run_extraction(monkeypatch)
    note = ClinicalNote.objects.get(pk=note_id)
    nodes, edges = extract_note_graph(note)
    persist_note_graph(note, nodes, edges)
    assert VaultEdge.objects.filter(note=note).count() == 1
    assert {node.mention_count for node in VaultNode.objects.filter(patient=note.patient)} == {1}


def test_checkpoint_after_automatic_reading_does_not_duplicate(records, client, automatic, monkeypatch):
    note_id = create_note(client, records)
    run_extraction(monkeypatch)
    note = ClinicalNote.objects.get(pk=note_id)
    monkeypatch.setattr(AIClient, "request_vault_synthesis", lambda self, payload: {"claims": []})
    analysis = AIAnalysis.objects.create(patient=note.patient, note=note, note_version=note.version, requested_by=records["owner"])
    create_checkpoint(analysis)
    assert VaultEdge.objects.filter(note=note).count() == 1
    assert {node.mention_count for node in VaultNode.objects.filter(patient=note.patient)} == {1}
    note.refresh_from_db()
    assert note.locked_at is not None


def test_a_second_note_counts_as_a_new_mention(records, client, automatic, monkeypatch):
    create_note(client, records)
    run_extraction(monkeypatch)
    create_note(client, records, "Outro relato sintético sobre luto pelo avô.")
    run_extraction(monkeypatch)
    assert {node.mention_count for node in VaultNode.objects.filter(patient=records["patient"])} == {2}


def test_editing_a_note_replaces_what_came_from_the_old_text(records, client, automatic, monkeypatch):
    note_id = create_note(client, records)
    run_extraction(monkeypatch)
    client.patch(f"/api/clinical-notes/{note_id}/", {"raw_text": EDITED}, format="json")
    run_extraction(monkeypatch, "mudança", "cidade")
    assert [edge.evidence for edge in VaultEdge.objects.filter(note_id=note_id)] == ["mudança de cidade"]
    assert {node.label for node in VaultNode.objects.filter(patient=records["patient"])} == {"mudança", "cidade"}


def test_concept_shared_with_another_note_survives_an_edit(records, client, automatic, monkeypatch):
    note_id = create_note(client, records)
    run_extraction(monkeypatch)
    create_note(client, records, "Outro relato sintético sobre luto pelo avô.")
    run_extraction(monkeypatch)
    client.patch(f"/api/clinical-notes/{note_id}/", {"raw_text": EDITED}, format="json")
    run_extraction(monkeypatch, "mudança", "cidade")
    assert {"luto", "avô", "mudança", "cidade"} == {node.label for node in VaultNode.objects.filter(patient=records["patient"])}


def test_superseded_version_does_not_call_the_model(records, client, automatic):
    note_id = create_note(client, records)
    client.patch(f"/api/clinical-notes/{note_id}/", {"raw_text": EDITED}, format="json")
    assert process_next_extraction_job()
    job = NoteExtractionJob.objects.get(note_id=note_id, note_version=1)
    assert job.status == VaultJob.Status.COMPLETED
    assert job.error_code == "SupersededNote"
    assert not VaultEdge.objects.filter(note_id=note_id).exists()


def test_note_edited_during_the_reading_is_not_stored(records, client, automatic, monkeypatch):
    note_id = create_note(client, records)

    def edit_while_reading(_self, payload):
        ClinicalNote.objects.filter(pk=note_id).update(version=2)
        return extraction_of("luto", "avô")(_self, payload)

    monkeypatch.setattr(AIClient, "request_vault", edit_while_reading)
    assert process_next_extraction_job()
    assert NoteExtractionJob.objects.get(note_id=note_id).error_code == "SupersededNote"
    assert not VaultEdge.objects.filter(note_id=note_id).exists()


def test_deleted_note_is_not_read(records, client, automatic):
    note_id = create_note(client, records)
    ClinicalNote.objects.get(pk=note_id).soft_delete()
    assert process_next_extraction_job()
    assert NoteExtractionJob.objects.get(note_id=note_id).error_code == "SupersededNote"


def test_author_without_access_stops_the_reading(records, client, automatic):
    note_id = create_note(client, records)
    author = records["owner"]
    author.is_active = False
    author.save(update_fields=["is_active"])
    assert process_next_extraction_job()
    job = NoteExtractionJob.objects.get(note_id=note_id)
    assert job.status == VaultJob.Status.FAILED
    assert job.error_code == "PermissionError"


def test_ai_failure_is_recorded_without_clinical_text(records, client, automatic, monkeypatch):
    note_id = create_note(client, records)
    monkeypatch.setattr(AIClient, "request_vault", unavailable)
    assert process_next_extraction_job()
    job = NoteExtractionJob.objects.get(note_id=note_id)
    assert job.status == VaultJob.Status.FAILED
    assert job.error_code == "AIServiceError"
    assert ORIGINAL not in job.error_code


def test_note_with_identifier_is_not_sent_to_the_model(records, client, automatic):
    note_id = create_note(client, records, "Mora na Rua das Flores, 123, conforme relato.")
    assert process_next_extraction_job()
    assert NoteExtractionJob.objects.get(note_id=note_id).error_code == "UnsafeClinicalText"


def test_vault_reports_pending_and_failed_readings(records, client, automatic, monkeypatch):
    create_note(client, records)
    monkeypatch.setattr(AIClient, "request_vault", unavailable)
    process_next_extraction_job()
    create_note(client, records, "Outra nota sintética.")
    body = client.get(f"/api/vault/patients/{records['patient'].id}/").json()
    assert body["extraction"] == {"pending": 1, "failed": 1}


def test_outsider_cannot_read_extraction_status(records, client, automatic):
    create_note(client, records)
    outsider = APIClient()
    outsider.force_authenticate(user=records["outsider"])
    assert outsider.get(f"/api/vault/patients/{records['patient'].id}/").status_code == 404


def test_retention_purge_removes_reading_jobs(records, client, automatic, monkeypatch, settings):
    settings.CLINICAL_RETENTION_DAYS = 1
    note_id = create_note(client, records)
    patient = records["patient"]
    Patient.objects.filter(pk=patient.pk).update(deleted_at=timezone.now() - timedelta(days=3))
    call_command("purge_expired_patients", "--apply", stdout=StringIO())
    assert not NoteExtractionJob.objects.filter(note_id=note_id).exists()
    assert not ClinicalNote.objects.filter(pk=note_id).exists()


def test_backfill_queues_existing_notes_once(records, settings):
    settings.AI_AUTO_EXTRACTION = True
    call_command("queue_note_extractions", stdout=StringIO())
    call_command("queue_note_extractions", stdout=StringIO())
    assert NoteExtractionJob.objects.filter(note=records["note"]).count() == 1


def test_backfill_refuses_to_run_while_disabled(records):
    with pytest.raises(CommandError):
        call_command("queue_note_extractions", stdout=StringIO())
    assert not NoteExtractionJob.objects.exists()


def test_automatic_reading_feeds_layered_retrieval(records, client, automatic, monkeypatch, settings):
    settings.AI_LOD_RETRIEVAL = True
    settings.AI_LOD_SOURCE_SEARCH = False
    note_id = create_note(client, records)
    run_extraction(monkeypatch)
    for index in range(12):
        ClinicalNote.objects.create(patient=records["patient"], author=records["owner"], raw_text=f"Rotina sintética {index}.")
    anchor = ClinicalNote.objects.create(patient=records["patient"], author=records["owner"], raw_text="Hoje falou do luto.")
    assert note_id in [item["note_id"] for item in build_context(records["patient"], 5, anchor=anchor)]
