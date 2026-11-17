import hashlib

import pytest

from apps.ai_analysis.models import AIAnalysis, AnalysisJob, VaultCheckpoint, VaultJob

from apps.clinical_notes.models import ClinicalNote
from apps.clinics.models import Clinic
from apps.patients.models import Patient, PatientAccess
from apps.therapy_sessions.models import TherapySession
from apps.users.models import User, UserRole


@pytest.fixture
def records(db):
    clinic = Clinic.objects.create(name="Clinic A", document="11111111111111")
    other_clinic = Clinic.objects.create(name="Clinic B", document="22222222222222")
    owner = User.objects.create_user(username="owner", password="unused", role=UserRole.PSYCHOLOGIST, clinic=clinic)
    reader = User.objects.create_user(username="reader", password="unused", role=UserRole.PSYCHOLOGIST, clinic=clinic)
    editor = User.objects.create_user(username="editor", password="unused", role=UserRole.PSYCHOLOGIST, clinic=clinic)
    outsider = User.objects.create_user(username="outsider", password="unused", role=UserRole.PSYCHOLOGIST, clinic=other_clinic)
    patient = Patient.objects.create(clinic=clinic, internal_code="P-1", display_name="Example", created_by=owner)
    other_patient = Patient.objects.create(clinic=clinic, internal_code="P-2", display_name="Other", created_by=owner)
    PatientAccess.objects.create(patient=patient, user=owner, can_edit=True, granted_by=owner)
    PatientAccess.objects.create(patient=other_patient, user=owner, can_edit=True, granted_by=owner)
    PatientAccess.objects.create(patient=patient, user=reader, can_edit=False, granted_by=owner)
    PatientAccess.objects.create(patient=patient, user=editor, can_edit=True, granted_by=owner)
    PatientAccess.objects.create(patient=other_patient, user=editor, can_edit=True, granted_by=owner)
    session = TherapySession.objects.create(patient=patient, professional=owner, scheduled_at="2026-11-02T12:00:00Z")
    note = ClinicalNote.objects.create(patient=patient, session=session, author=owner, raw_text="Original text", anonymized_text="Original text")
    return locals()


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


@pytest.fixture
def foreign_records(records):
    patient = Patient.objects.create(
        clinic=records["other_clinic"], created_by=records["outsider"],
        internal_code="FOREIGN-SYNTHETIC", display_name="FOREIGN-SYNTHETIC-SECRET",
    )
    session = TherapySession.objects.create(
        patient=patient, professional=records["outsider"], scheduled_at="2026-11-03T12:00:00Z",
    )
    note = ClinicalNote.objects.create(
        patient=patient, session=session, author=records["outsider"], raw_text="FOREIGN-SYNTHETIC-NOTE",
    )
    return {"patient": patient, "session": session, "note": note}
