"""Regression coverage for cross-tenant and clinical data isolation (F0-02)."""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.clinical_notes.models import ClinicalNote
from apps.therapy_sessions.models import TherapySession
from rest_framework.test import APIClient

from apps.clinics.models import Clinic
from apps.patients.models import Patient, PatientAccess
from apps.patients.access import accessible_patients


class PatientAccessTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.a = Clinic.objects.create(name="Clínica A")
        cls.b = Clinic.objects.create(name="Clínica B")
        User = get_user_model()
        cls.admin_a = User.objects.create_user(username="adm_a", password="temporary-testing-only", clinic=cls.a, role="ADMIN")
        cls.admin_b = User.objects.create_user(username="adm_b", password="temporary-testing-only", clinic=cls.b, role="ADMIN")
        cls.psych_a = User.objects.create_user(username="psy_a", password="temporary-testing-only", clinic=cls.a, role="PSYCHOLOGIST")
        cls.patient_a = Patient.objects.create(clinic=cls.a, internal_code="A-1", display_name="Pessoa fictícia A", created_by=cls.psych_a)
        cls.patient_b = Patient.objects.create(clinic=cls.b, internal_code="B-1", display_name="Pessoa fictícia B", created_by=cls.admin_b)

    def test_admin_is_confined_to_their_clinic(self):
        self.assertTrue(accessible_patients(self.admin_a).filter(pk=self.patient_a.pk).exists())
        self.assertFalse(accessible_patients(self.admin_a).filter(pk=self.patient_b.pk).exists())

    def test_admin_is_not_implicitly_authorized_to_read_notes(self):
        self.assertFalse(accessible_patients(self.admin_a, clinical=True).filter(pk=self.patient_a.pk).exists())
        PatientAccess.objects.create(patient=self.patient_a, user=self.admin_a, can_edit=False, granted_by=self.psych_a)
        self.assertTrue(accessible_patients(self.admin_a, clinical=True).filter(pk=self.patient_a.pk).exists())
        self.assertFalse(accessible_patients(self.admin_a, clinical=True, write=True).filter(pk=self.patient_a.pk).exists())

    def test_patient_endpoint_does_not_expose_other_clinic(self):
        client = APIClient()
        client.force_authenticate(user=self.admin_a)
        response = client.get("/api/patients/")
        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data["results"]]
        self.assertIn(str(self.patient_a.id), [str(i) for i in ids])
        self.assertNotIn(str(self.patient_b.id), [str(i) for i in ids])
        self.assertEqual(client.get(f"/api/patients/{self.patient_b.pk}/").status_code, 404)

    def test_unauthenticated_user_cannot_list_patients(self):
        self.assertIn(APIClient().get("/api/patients/").status_code, (401, 403))

    def test_clinical_notes_and_sessions_are_not_visible_across_clinics(self):
        TherapySession.objects.create(patient=self.patient_b, professional=self.admin_b, scheduled_at=timezone.now())
        ClinicalNote.objects.create(patient=self.patient_b, author=self.admin_b, raw_text="NOTA SINTÉTICA B")
        client = APIClient()
        client.force_authenticate(user=self.admin_a)
        for endpoint in ("/api/clinical-notes/", "/api/sessions/", "/api/analysis/"):
            response = client.get(endpoint)
            self.assertEqual(response.status_code, 200, endpoint)
            self.assertEqual(response.data["count"], 0, endpoint)

    def test_administrator_without_clinical_grant_cannot_create_note(self):
        client = APIClient()
        client.force_authenticate(user=self.admin_a)
        response = client.post("/api/clinical-notes/", {"patient": str(self.patient_a.pk), "raw_text": "Conteúdo fictício"})
        self.assertIn(response.status_code, (400, 403))

    def test_signed_note_cannot_be_modified(self):
        note = ClinicalNote.objects.create(
            patient=self.patient_a, author=self.psych_a,
            raw_text="Original sintético", locked_at=timezone.now(),
        )
        client = APIClient()
        client.force_authenticate(user=self.psych_a)
        response = client.patch(f"/api/clinical-notes/{note.pk}/", {"raw_text": "Edição proibida"}, format="json")
        self.assertEqual(response.status_code, 403)
        note.refresh_from_db()
        self.assertEqual(note.raw_text, "Original sintético")
