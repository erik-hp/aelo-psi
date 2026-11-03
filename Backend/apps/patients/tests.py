"""Regression coverage for cross-tenant and clinical data isolation (F0-02)."""
from django.test import TestCase
from django.core.exceptions import ValidationError
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
        PatientAccess.objects.create(patient=cls.patient_a, user=cls.psych_a, can_edit=True, granted_by=cls.psych_a)

    def test_intern_cannot_edit_even_with_legacy_write_grant(self):
        User = get_user_model()
        intern = User.objects.create_user(username='readonly_intern', password='test-only', role='INTERN', clinic=self.a)
        PatientAccess.objects.bulk_create([PatientAccess(patient=self.patient_a, user=intern, granted_by=self.psych_a, can_edit=True)])
        self.assertTrue(accessible_patients(intern, clinical=True).filter(pk=self.patient_a.pk).exists())
        self.assertFalse(accessible_patients(intern, clinical=True, write=True).filter(pk=self.patient_a.pk).exists())

    def test_intern_cannot_register_patient(self):
        User = get_user_model()
        intern = User.objects.create_user(username='new_patient_intern', password='test-only', role='INTERN', clinic=self.a)
        client = APIClient()
        client.force_authenticate(user=intern)
        response = client.post('/api/patients/', {'internal_code': 'DENIED', 'display_name': 'Synthetic'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_admin_is_confined_to_their_clinic(self):
        self.assertTrue(accessible_patients(self.admin_a).filter(pk=self.patient_a.pk).exists())
        self.assertFalse(accessible_patients(self.admin_a).filter(pk=self.patient_b.pk).exists())

    def test_admin_is_not_implicitly_authorized_to_read_notes(self):
        self.assertFalse(accessible_patients(self.admin_a, clinical=True).filter(pk=self.patient_a.pk).exists())
        with self.assertRaises(ValidationError):
            PatientAccess.objects.create(patient=self.patient_a, user=self.admin_a, can_edit=False, granted_by=self.psych_a)
        self.assertFalse(accessible_patients(self.admin_a, clinical=True).filter(pk=self.patient_a.pk).exists())
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

    def test_admin_patient_creation_does_not_grant_clinical_access(self):
        client = APIClient()
        client.force_authenticate(user=self.admin_a)
        response = client.post("/api/patients/", {"internal_code": "A-NEW", "display_name": "Pessoa Sintética"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertFalse(PatientAccess.objects.filter(patient_id=response.data["id"], user=self.admin_a).exists())

    def test_cross_clinic_grant_rejected_at_model_boundary(self):
        with self.assertRaises(ValidationError):
            PatientAccess.objects.create(
                patient=self.patient_a, user=self.admin_b,
                granted_by=self.psych_a, can_edit=True,
            )

    def test_admin_cannot_self_assign_clinical_access(self):
        with self.assertRaises(ValidationError):
            PatientAccess.objects.create(
                patient=self.patient_a, user=self.admin_a,
                granted_by=self.admin_a, can_edit=True,
            )

    def test_grant_then_revoke_ends_clinical_access(self):
        User = get_user_model()
        second = User.objects.create_user(
            username="granted_psych", password="test-only",
            role="PSYCHOLOGIST", clinic=self.a,
        )
        client = APIClient()
        client.force_authenticate(user=self.psych_a)
        url = f"/api/patients/{self.patient_a.pk}/"
        created = client.post(url + "grant-access/", {"user": str(second.pk), "can_edit": True}, format="json")
        self.assertEqual(created.status_code, 201, getattr(created, "data", ""))
        self.assertTrue(accessible_patients(second, clinical=True, write=True).filter(pk=self.patient_a.pk).exists())
        revoked = client.post(url + "revoke-access/", {"user": str(second.pk)}, format="json")
        self.assertEqual(revoked.status_code, 204, getattr(revoked, "data", ""))
        self.assertFalse(accessible_patients(second, clinical=True).filter(pk=self.patient_a.pk).exists())

    def test_cannot_revoke_last_responsible_psychologist(self):
        client = APIClient()
        client.force_authenticate(user=self.psych_a)
        response = client.post(
            f"/api/patients/{self.patient_a.pk}/revoke-access/",
            {"user": str(self.psych_a.pk)}, format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertTrue(PatientAccess.objects.filter(patient=self.patient_a, user=self.psych_a).exists())

    def test_cross_clinic_grant_endpoint_refused(self):
        client = APIClient()
        client.force_authenticate(user=self.psych_a)
        response = client.post(
            f"/api/patients/{self.patient_a.pk}/grant-access/",
            {"user": str(self.admin_b.pk), "can_edit": True}, format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_administrator_cannot_grant_access_to_themselves(self):
        client = APIClient()
        client.force_authenticate(user=self.admin_a)
        response = client.post(
            f"/api/patients/{self.patient_a.pk}/grant-access/",
            {"user": str(self.admin_a.pk), "can_edit": True}, format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_patient_creator_cannot_read_after_explicit_revoke(self):
        User = get_user_model()
        second = User.objects.create_user(
            username="delegate_psych", password="test-only", role="PSYCHOLOGIST", clinic=self.a,
        )
        PatientAccess.objects.create(
            patient=self.patient_a, user=second, granted_by=self.psych_a, can_edit=True,
        )
        client = APIClient()
        client.force_authenticate(user=second)
        r = client.post(
            f"/api/patients/{self.patient_a.pk}/revoke-access/",
            {"user": str(self.psych_a.pk)}, format="json",
        )
        self.assertEqual(r.status_code, 204, getattr(r, "data", ""))
        self.assertFalse(accessible_patients(self.psych_a, clinical=True).filter(pk=self.patient_a.pk).exists())

    def test_psychologist_cannot_delete_patient_or_hide_history(self):
        client = APIClient()
        client.force_authenticate(user=self.psych_a)
        response = client.delete(f"/api/patients/{self.patient_a.pk}/")
        self.assertEqual(response.status_code, 403)
        self.patient_a.refresh_from_db()
        self.assertIsNone(self.patient_a.deleted_at)

    def test_administrator_cannot_delete_patient(self):
        client = APIClient()
        client.force_authenticate(user=self.admin_a)
        response = client.delete(f"/api/patients/{self.patient_a.pk}/")
        self.assertEqual(response.status_code, 403)
        self.patient_a.refresh_from_db()
        self.assertIsNone(self.patient_a.deleted_at)

    def test_psychologist_cannot_archive_patient(self):
        client = APIClient()
        client.force_authenticate(user=self.psych_a)
        response = client.post(f"/api/patients/{self.patient_a.pk}/archive/")
        self.assertEqual(response.status_code, 403)
        self.patient_a.refresh_from_db()
        self.assertEqual(self.patient_a.status, "ACTIVE")

    def test_administrator_can_archive_patient_without_deletion(self):
        client = APIClient()
        client.force_authenticate(user=self.admin_a)
        response = client.post(f"/api/patients/{self.patient_a.pk}/archive/")
        self.assertEqual(response.status_code, 200)
        self.patient_a.refresh_from_db()
        self.assertEqual(self.patient_a.status, "ARCHIVED")
        self.assertIsNone(self.patient_a.deleted_at)

    def test_psychologist_cannot_change_patient_status_through_patch(self):
        client = APIClient()
        client.force_authenticate(user=self.psych_a)
        response = client.patch(
            f"/api/patients/{self.patient_a.pk}/",
            {"status": "INACTIVE"}, format="json"
        )
        self.assertEqual(response.status_code, 403)
