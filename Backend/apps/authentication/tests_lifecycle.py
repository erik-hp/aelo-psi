"""F0-04 lifecycle: a suspended clinic must not be able to use live JWTs."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.clinics.models import Clinic


class AuthenticationLifecycleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.clinic = Clinic.objects.create(name="Clínica Sintética JWT")
        cls.other_clinic = Clinic.objects.create(name="Outra Clínica Sintética JWT")
        U = get_user_model()
        cls.professional = U.objects.create_user(
            username="jwt_psych", password="Testing!Strong1234",
            clinic=cls.clinic, role="PSYCHOLOGIST",
        )
        cls.other_professional = U.objects.create_user(
            username="jwt_other", password="Testing!Strong1234",
            clinic=cls.other_clinic, role="PSYCHOLOGIST",
        )
        cls.no_clinic = U.objects.create_user(
            username="jwt_unassigned", password="Testing!Strong1234",
            role="PSYCHOLOGIST",
        )

    def login(self, username):
        return APIClient().post(
            "/api/auth/login/",
            {"username": username, "password": "Testing!Strong1234"},
            format="json",
        )

    def test_valid_active_clinic_login_and_refresh(self):
        response = self.login(self.professional.username)
        self.assertEqual(response.status_code, 200)
        client = APIClient()
        refreshed = client.post(
            "/api/auth/refresh/",
            {"refresh": response.data["refresh"]}, format="json",
        )
        self.assertEqual(refreshed.status_code, 200)
        self.assertIn("access", refreshed.data)

    def test_login_rejects_unassigned_clinic(self):
        response = self.login(self.no_clinic.username)
        self.assertIn(response.status_code, (401, 403))

    def test_login_rejects_inactive_clinic(self):
        self.clinic.is_active = False
        self.clinic.save(update_fields=["is_active"])
        response = self.login(self.professional.username)
        self.assertIn(response.status_code, (401, 403))

    def test_refresh_and_access_reject_after_clinic_suspension(self):
        tokens = self.login(self.professional.username).data
        self.clinic.is_active = False
        self.clinic.save(update_fields=["is_active"])
        self.assertIn(APIClient().post(
            "/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json"
        ).status_code, (401, 403))
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.assertEqual(client.get("/api/patients/").status_code, 401)

    def test_refresh_rejects_after_account_deactivation(self):
        tokens = self.login(self.professional.username).data
        self.professional.is_active = False
        self.professional.save(update_fields=["is_active"])
        response = APIClient().post(
            "/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json"
        )
        self.assertIn(response.status_code, (401, 403))

    def test_logout_does_not_blacklist_another_users_token(self):
        own = self.login(self.professional.username).data
        other = self.login(self.other_professional.username).data
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {own['access']}")
        response = client.post(
            "/api/auth/logout/", {"refresh": other["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        # Invalid logout attempt must not consume the legitimate owner's token.
        self.assertEqual(APIClient().post(
            "/api/auth/refresh/", {"refresh": other["refresh"]}, format="json"
        ).status_code, 200)

    def test_logout_own_token_blocks_refresh(self):
        own = self.login(self.professional.username).data
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {own['access']}")
        self.assertEqual(client.post(
            "/api/auth/logout/", {"refresh": own["refresh"]}, format="json"
        ).status_code, 204)
        self.assertIn(APIClient().post(
            "/api/auth/refresh/", {"refresh": own["refresh"]}, format="json"
        ).status_code, (401, 403))
