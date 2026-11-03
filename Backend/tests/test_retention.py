from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from apps.ai_analysis.models import AIAnalysis
from apps.audit_logs.integrity import verify_audit_chain
from apps.audit_logs.models import AuditLog
from apps.clinical_notes.models import ClinicalNote
from apps.patients.models import Patient
from apps.therapy_sessions.models import TherapySession


@pytest.mark.django_db
@override_settings(CLINICAL_RETENTION_DAYS=365)
def test_retention_defaults_to_dry_run_and_purges_only_expired_deleted_patient(records):
    patient = records["patient"]
    AIAnalysis.objects.create(patient=patient, requested_by=records["owner"], patterns=["sensitive"])
    Patient.objects.filter(pk=patient.pk).update(deleted_at=timezone.now() - timedelta(days=400))

    output = StringIO()
    call_command("purge_expired_patients", stdout=output)
    assert "Dry run: 1" in output.getvalue()
    assert Patient.objects.filter(pk=patient.pk).exists()
    assert ClinicalNote.objects.filter(patient=patient).exists()

    call_command("purge_expired_patients", "--apply", stdout=StringIO())
    assert not Patient.objects.filter(pk=patient.pk).exists()
    assert not ClinicalNote.objects.filter(patient_id=patient.pk).exists()
    assert not TherapySession.objects.filter(patient_id=patient.pk).exists()
    assert not AIAnalysis.objects.filter(patient_id=patient.pk).exists()
    assert Patient.objects.filter(pk=records["other_patient"].pk).exists()
    assert AuditLog.objects.filter(action="RETENTION_PURGE", entity_id=str(patient.pk)).exists()
    assert verify_audit_chain()[0]
