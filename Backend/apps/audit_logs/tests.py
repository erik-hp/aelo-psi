"""Audit privacy regression tests using synthetic records only."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from apps.clinics.models import Clinic
from apps.patients.models import Patient
from apps.clinical_notes.models import ClinicalNote
from apps.audit_logs.models import AuditLog
from apps.audit_logs.services import sanitized_metadata, get_client_ip


class AuditPrivacyTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.clinic = Clinic.objects.create(name="Unidade Sintética")
        cls.other_clinic = Clinic.objects.create(name="Outra Unidade Sintética")
        User = get_user_model()
        cls.professional = User.objects.create_user(
            username="audited_professional", password="synthetic-password-for-test-only",
            role="PSYCHOLOGIST", clinic=cls.clinic,
        )
        cls.admin = User.objects.create_user(
            username="audited_admin", password="synthetic-password-for-test-only",
            role="ADMIN", clinic=cls.clinic,
        )
        cls.other_admin = User.objects.create_user(
            username="other_audited_admin", password="synthetic-password-for-test-only",
            role="ADMIN", clinic=cls.other_clinic,
        )
        cls.patient = Patient.objects.create(
            clinic=cls.clinic, internal_code="SY-001",
            display_name="Pessoa Sintética", created_by=cls.professional,
        )
        from apps.patients.models import PatientAccess
        PatientAccess.objects.create(patient=cls.patient, user=cls.professional, granted_by=cls.professional, can_edit=True)
        cls.note = ClinicalNote.objects.create(
            patient=cls.patient, author=cls.professional,
            raw_text="Texto sintético sigiloso não deve estar no log",
        )

    def test_audit_metadata_rejects_comments_and_record_contents(self):
        self.assertEqual(
            sanitized_metadata({
                "module": "ai_analysis", "comment": "conteúdo sigiloso",
                "raw_text": "outro conteúdo sigiloso", "status_code": 403,
                "patient": "identifier",
            }),
            {"module": "ai_analysis", "status_code": 403},
        )

    def test_client_ip_ignores_untrusted_forwarded_header(self):
        from django.test import RequestFactory
        req = RequestFactory().get("/", HTTP_X_FORWARDED_FOR="198.51.100.33")
        self.assertEqual(get_client_ip(req), req.META.get("REMOTE_ADDR"))

    def test_note_detail_read_is_logged_without_text(self):
        client = APIClient()
        client.force_authenticate(user=self.professional)
        result = client.get(f"/api/clinical-notes/{self.note.pk}/")
        self.assertEqual(result.status_code, 200)
        log = AuditLog.objects.get(user=self.professional, action="READ", entity="ClinicalNote")
        self.assertEqual(log.entity_id, str(self.note.pk))
        self.assertNotIn("sigiloso", str(log.metadata))
        self.assertNotIn("raw_text", str(log.metadata))

    def test_admin_cannot_read_other_clinic_audit_events(self):
        client = APIClient()
        client.force_authenticate(user=self.professional)
        client.get(f"/api/clinical-notes/{self.note.pk}/")
        other = APIClient()
        other.force_authenticate(user=self.other_admin)
        response = other.get("/api/audit-logs/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_untrusted_user_agent_is_not_stored_in_audit(self):
        client = APIClient()
        client.force_authenticate(user=self.professional)
        response = client.get(
            f"/api/clinical-notes/{self.note.pk}/",
            HTTP_USER_AGENT="Clinical text should not be logged",
        )
        self.assertEqual(response.status_code, 200)
        log = AuditLog.objects.filter(
            user=self.professional, action="READ", entity="ClinicalNote"
        ).latest("created_at")
        self.assertEqual(log.user_agent, "")
        self.assertNotIn("Clinical text", str(log.metadata))
