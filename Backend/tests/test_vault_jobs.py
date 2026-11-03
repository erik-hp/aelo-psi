import pytest
from rest_framework.test import APIClient

from apps.ai_analysis.jobs import process_next_job, process_next_analysis_job
from apps.ai_analysis.models import AIAnalysis, VaultJob, AnalysisJob
from apps.patients.models import PatientAccess


@pytest.mark.django_db
def test_checkpoint_request_queues_work_without_running_ai(records, monkeypatch):
    patient, note, owner, outsider = (records[key] for key in ("patient", "note", "owner", "outsider"))
    analysis = AIAnalysis.objects.create(patient=patient, note=note, note_version=note.version, requested_by=owner)
    client = APIClient()
    client.force_authenticate(user=owner)
    response = client.post(f"/api/vault/analyses/{analysis.pk}/checkpoint/")
    assert response.status_code == 202
    job = VaultJob.objects.get(analysis=analysis)
    assert job.status == VaultJob.Status.PENDING
    assert client.post(f"/api/vault/analyses/{analysis.pk}/checkpoint/").json()["job_id"] == str(job.pk)
    client.force_authenticate(user=outsider)
    assert client.get(f"/api/vault/jobs/{job.pk}/").status_code == 404

    called = []
    monkeypatch.setattr("apps.ai_analysis.jobs.create_checkpoint", lambda target: called.append(target.pk))
    assert process_next_job()
    job.refresh_from_db()
    assert job.status == VaultJob.Status.COMPLETED
    assert called == [analysis.pk]


@pytest.mark.django_db
def test_vault_worker_records_failure_without_clinical_text(records, monkeypatch):
    patient, note, owner = (records[key] for key in ("patient", "note", "owner"))
    analysis = AIAnalysis.objects.create(patient=patient, note=note, note_version=note.version, requested_by=owner)
    job = VaultJob.objects.create(analysis=analysis)

    def fail(_analysis):
        raise ValueError("sensitive clinical narrative")

    monkeypatch.setattr("apps.ai_analysis.jobs.create_checkpoint", fail)
    assert process_next_job()
    job.refresh_from_db()
    assert job.status == VaultJob.Status.FAILED
    assert job.error_code == "ValueError"


@pytest.mark.django_db
def test_analysis_request_uses_worker_and_scoped_status(records, monkeypatch):
    patient, note, owner, outsider = (records[key] for key in ("patient", "note", "owner", "outsider"))
    client = APIClient()
    client.force_authenticate(user=owner)
    response = client.post("/api/analysis/request/", {"patient": str(patient.pk), "note": str(note.pk)})
    assert response.status_code == 202
    job = AnalysisJob.objects.get(pk=response.json()["job_id"])
    client.force_authenticate(user=outsider)
    assert client.get(f"/api/analysis/jobs/{job.pk}/").status_code == 404
    result = AIAnalysis.objects.create(patient=patient, note=note, note_version=note.version, requested_by=owner)
    monkeypatch.setattr("apps.ai_analysis.jobs.request_ai_analysis", lambda **_kwargs: result)
    assert process_next_analysis_job()
    job.refresh_from_db()
    assert job.status == VaultJob.Status.COMPLETED
    assert job.result_id == result.pk


@pytest.mark.django_db
def test_worker_rechecks_access_after_job_is_queued(records, monkeypatch):
    patient, note, editor = (records[key] for key in ("patient", "note", "editor"))
    client = APIClient()
    client.force_authenticate(user=editor)
    response = client.post("/api/analysis/request/", {"patient": str(patient.pk), "note": str(note.pk)})
    assert response.status_code == 202
    job = AnalysisJob.objects.get(pk=response.json()["job_id"])
    PatientAccess.objects.filter(patient=patient, user=editor).update(can_edit=False)

    called = []
    monkeypatch.setattr("apps.ai_analysis.jobs.request_ai_analysis", lambda **kwargs: called.append(kwargs))
    assert process_next_analysis_job()
    job.refresh_from_db()
    assert job.status == VaultJob.Status.FAILED
    assert job.error_code == "PermissionError"
    assert not called
