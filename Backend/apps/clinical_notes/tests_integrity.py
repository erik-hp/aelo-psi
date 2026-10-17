"""F0 regression tests: cross-professional changes and session integrity."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.clinics.models import Clinic
from apps.patients.models import Patient, PatientAccess
from apps.therapy_sessions.models import TherapySession
from apps.clinical_notes.models import ClinicalNote, ClinicalNoteHistory


class ClinicalRelationsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        clinic = Clinic.objects.create(name="Synthetic Clinical Integrity")
        U = get_user_model()
        cls.first = U.objects.create_user(username="integrity_a", password="test-only", clinic=clinic, role="PSYCHOLOGIST")
        cls.second = U.objects.create_user(username="integrity_b", password="test-only", clinic=clinic, role="PSYCHOLOGIST")
        cls.patient = Patient.objects.create(clinic=clinic, internal_code="INT-001", display_name="Synthetic Patient", created_by=cls.first)
        PatientAccess.objects.create(patient=cls.patient, user=cls.first, granted_by=cls.first, can_edit=True)
        PatientAccess.objects.create(patient=cls.patient, user=cls.second, granted_by=cls.first, can_edit=True)
        cls.session = TherapySession.objects.create(patient=cls.patient, professional=cls.first, scheduled_at=timezone.now())
        cls.note = ClinicalNote.objects.create(patient=cls.patient, session=cls.session, author=cls.first, raw_text="Synthetic original")

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_other_professional_cannot_modify_or_delete_note(self):
        c = self.client_for(self.second)
        url = f"/api/clinical-notes/{self.note.pk}/"
        self.assertEqual(c.patch(url, {"raw_text": "Changed"}, format="json").status_code, 404)
        self.assertEqual(c.delete(url).status_code, 404)
        self.note.refresh_from_db()
        self.assertEqual(self.note.raw_text, "Synthetic original")

    def test_other_professional_cannot_modify_session(self):
        response = self.client_for(self.second).patch(
            f"/api/sessions/{self.session.pk}/", {"summary": "Changed"}, format="json"
        )
        self.assertEqual(response.status_code, 404)

    def test_session_cannot_be_reassigned_on_note(self):
        other_session = TherapySession.objects.create(
            patient=self.patient, professional=self.first, scheduled_at=timezone.now()
        )
        response = self.client_for(self.first).patch(
            f"/api/clinical-notes/{self.note.pk}/", {"session": str(other_session.pk)}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_note_cannot_reference_another_professionals_session(self):
        response = self.client_for(self.second).post(
            "/api/clinical-notes/",
            {"patient": str(self.patient.pk), "session": str(self.session.pk), "raw_text": "Synthetic"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_edit_keeps_history_and_incremented_version(self):
        response = self.client_for(self.first).patch(
            f"/api/clinical-notes/{self.note.pk}/", {"raw_text": "Synthetic revision"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.note.refresh_from_db()
        self.assertEqual(self.note.version, 2)
        self.assertEqual(ClinicalNoteHistory.objects.get(note=self.note, version=1).raw_text, "Synthetic original")
