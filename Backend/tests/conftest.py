import pytest

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
