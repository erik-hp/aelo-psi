"""F0-04 lifecycle: a suspended clinic must not be able to use live JWTs."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.clinics.models import Clinic


class AuthenticationLifecycleTests(TestCase):
    def setUp(self):
        cache.clear()

    @classmethod
    def setUpTestData(cls):
        cls.clinic = Clinic.objects.create(name="Clínica Sintética JWT")
        cls.other_clinic = Clinic.objects.create(name="Outra Clínica Sintética JWT")
        U = get_user_model()
        cls.professional = U.objects.create_user(
            username="jwt_psych", email="jwt-psych@example.test", password="Testing!Strong1234",
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

    def login(self, username, client=None):
        client = client or APIClient()
        return client.post(
            "/api/auth/login/",
            {"username": username, "password": "Testing!Strong1234"},
            format="json", HTTP_ORIGIN="http://testserver",
        )

    def refresh(self, client):
        return client.post("/api/auth/refresh/", format="json", HTTP_ORIGIN="http://testserver", HTTP_X_AELO_SESSION="1")

    def logout(self, client):
        return client.post("/api/auth/logout/", format="json", HTTP_ORIGIN="http://testserver", HTTP_X_AELO_SESSION="1")

    def test_valid_active_clinic_login_and_refresh(self):
        client = APIClient()
        response = self.login(self.professional.username, client)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("refresh", response.data)
        refreshed = self.refresh(client)
        self.assertEqual(refreshed.status_code, 200)
        self.assertIn("access", refreshed.data)

    def test_email_login_uses_exact_account_email(self):
        response = self.login("jwt-psych@example.test")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["username"], "jwt_psych")

    def test_login_rejects_unassigned_clinic(self):
        response = self.login(self.no_clinic.username)
        self.assertIn(response.status_code, (401, 403))

    def test_login_rejects_inactive_clinic(self):
        self.clinic.is_active = False
        self.clinic.save(update_fields=["is_active"])
        response = self.login(self.professional.username)
        self.assertIn(response.status_code, (401, 403))

    def test_refresh_and_access_reject_after_clinic_suspension(self):
        client = APIClient()
        tokens = self.login(self.professional.username, client).data
        self.clinic.is_active = False
        self.clinic.save(update_fields=["is_active"])
        self.assertIn(self.refresh(client).status_code, (401, 403))
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.assertEqual(client.get("/api/patients/").status_code, 401)

    def test_refresh_rejects_after_account_deactivation(self):
        client = APIClient()
        self.login(self.professional.username, client)
        self.professional.is_active = False
        self.professional.save(update_fields=["is_active"])
        response = self.refresh(client)
        self.assertIn(response.status_code, (401, 403))

    def test_logout_does_not_blacklist_another_users_token(self):
        own_client = APIClient()
        other_client = APIClient()
        own = self.login(self.professional.username, own_client).data
        self.login(self.other_professional.username, other_client)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {own['access']}")
        client.cookies["aelo_refresh"] = other_client.cookies["aelo_refresh"].value
        response = self.logout(client)
        self.assertEqual(response.status_code, 400)
        # Invalid logout attempt must not consume the legitimate owner's token.
        self.assertEqual(self.refresh(other_client).status_code, 200)

    def test_logout_own_token_blocks_refresh(self):
        client = APIClient()
        own = self.login(self.professional.username, client).data
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {own['access']}")
        old_cookie = client.cookies["aelo_refresh"].value
        self.assertEqual(self.logout(client).status_code, 204)
        client.cookies["aelo_refresh"] = old_cookie
        self.assertIn(self.refresh(client).status_code, (401, 403))
