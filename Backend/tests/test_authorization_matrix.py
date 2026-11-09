"""F0-02: clinical reads must keep their scope across every derived endpoint.

Uses synthetic persisted records and real DRF views/serializers. Authentication
is forced to isolate object authorization; JWT lifecycle has a separate suite.
"""

import hashlib

import pytest
from rest_framework.test import APIClient

from apps.ai_analysis.models import AIAnalysis, AnalysisJob, VaultCheckpoint, VaultJob
from apps.patients.models import PatientAccess
from apps.users.models import User, UserRole


@pytest.fixture
def clinical_scope(records):
    patient, owner = records["patient"], records["owner"]
    actors = {name: records[name] for name in ("owner", "reader", "editor", "outsider")}
    for name, role in (
        ("intern", UserRole.INTERN),
        ("admin", UserRole.ADMIN),
        ("ungranted", UserRole.PSYCHOLOGIST),
        ("revoked", UserRole.PSYCHOLOGIST),
    ):
        actors[name] = User.objects.create_user(username=name, role=role, clinic=patient.clinic)
    for name in ("intern", "revoked"):
        PatientAccess.objects.create(patient=patient, user=actors[name], granted_by=owner)
    PatientAccess.objects.filter(patient=patient, user=actors["revoked"]).delete()
    actors["anonymous"] = None
    analysis = AIAnalysis.objects.create(patient=patient, note=records["note"], requested_by=owner)
    analysis_job = AnalysisJob.objects.create(patient=patient, note=records["note"], requested_by=owner)
    vault_job = VaultJob.objects.create(analysis=analysis)
    text = "Synthetic checkpoint evidence"
    checkpoint = VaultCheckpoint.objects.create(
        patient=patient, analysis=analysis, markdown=text,
        content_sha256=hashlib.sha256(text.encode()).hexdigest(),
    )
    paths = {
        "note": f"/api/clinical-notes/{records['note'].pk}/",
        "session": f"/api/sessions/{records['session'].pk}/",
        "analysis": f"/api/analysis/{analysis.pk}/",
        "analysis-job": f"/api/analysis/jobs/{analysis_job.pk}/",
        "vault": f"/api/vault/patients/{patient.pk}/",
        "vault-job": f"/api/vault/jobs/{vault_job.pk}/",
        "checkpoint": f"/api/vault/checkpoints/{checkpoint.pk}/",
        "fhir": f"/api/patients/{patient.pk}/fhir/",
    }
    return actors, paths


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint", ["note", "session", "analysis", "analysis-job", "vault", "vault-job", "checkpoint", "fhir"])
@pytest.mark.parametrize("actor", ["owner", "reader", "editor", "intern", "admin", "ungranted", "revoked", "outsider", "anonymous"])
def test_clinical_read_authorization_matrix(clinical_scope, actor, endpoint):
    actors, paths = clinical_scope
    client = APIClient()
    if actors[actor] is not None:
        client.force_authenticate(user=actors[actor])
    response = client.get(paths[endpoint])
    if actor in {"owner", "reader", "editor", "intern"}:
        assert response.status_code == 200
    else:
        # An admin sees the registration directory, but export still requires
        # clinical access. Other callers cannot even resolve the patient.
        expected = 401 if actor == "anonymous" else 403 if actor == "admin" and endpoint == "fhir" else 404
        assert response.status_code == expected
        assert b"Original text" not in response.content
        assert b"Synthetic checkpoint evidence" not in response.content


@pytest.mark.django_db
@pytest.mark.parametrize("actor", ["reader", "intern", "admin", "ungranted", "revoked", "outsider", "anonymous"])
def test_read_access_never_authorizes_ai_processing(clinical_scope, records, actor):
    actors, _ = clinical_scope
    client = APIClient()
    if actors[actor] is not None:
        client.force_authenticate(user=actors[actor])
    before = AnalysisJob.objects.count()
    response = client.post("/api/analysis/request/", {"patient": str(records["patient"].pk)}, format="json")
    expected = 401 if actor == "anonymous" else 403 if actor in {"reader", "intern"} else 404
    assert response.status_code == expected
    assert AnalysisJob.objects.count() == before
