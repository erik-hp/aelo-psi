"""Tenant-admin privilege escalation regression tests."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from apps.clinics.models import Clinic


class StaffManagementSecurityTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.clinic = Clinic.objects.create(name="Clínica Sintética Usuários")
        cls.other = Clinic.objects.create(name="Outra Clínica Sintética Usuários")
        U = get_user_model()
        cls.admin = U.objects.create_user(username="staff_admin_a", password="test-only", clinic=cls.clinic, role="ADMIN")
        cls.other_admin = U.objects.create_user(username="staff_admin_b", password="test-only", clinic=cls.other, role="ADMIN")
        cls.staff = U.objects.create_user(username="staff_intern", password="test-only", clinic=cls.clinic, role="INTERN")

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_cannot_create_admin(self):
        response = self.client.post("/api/users/", {"username": "new_admin", "role": "ADMIN", "password": "StrongPassword!87423"})
        self.assertEqual(response.status_code, 400)

    def test_cannot_promote_intern(self):
        response = self.client.patch(f"/api/users/{self.staff.pk}/", {"role": "ADMIN"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.staff.refresh_from_db()
        self.assertEqual(self.staff.role, "INTERN")

    def test_cannot_change_clinic_even_for_new_user(self):
        response = self.client.post("/api/users/", {
            "username": "new_intern", "role": "INTERN", "clinic": str(self.other.pk),
        }, format="json")
        self.assertEqual(response.status_code, 201)
        U = get_user_model()
        self.assertEqual(U.objects.get(username="new_intern").clinic_id, self.clinic.pk)

    def test_cannot_update_other_admin(self):
        response = self.client.patch(f"/api/users/{self.other_admin.pk}/", {"is_active": False}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_cannot_update_own_privileged_identity(self):
        response = self.client.patch(f"/api/users/{self.admin.pk}/", {"is_active": False}, format="json")
        self.assertEqual(response.status_code, 404)
