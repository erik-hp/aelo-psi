"""Security configuration checks, without handling real credentials."""
from django.test import SimpleTestCase, override_settings
from django.conf import settings
from django.urls import resolve, Resolver404


class SecuritySettingsTests(SimpleTestCase):
    def test_default_proxy_header_is_untrusted(self):
        self.assertIsNone(settings.SECURE_PROXY_SSL_HEADER)

    def test_cookies_use_secure_flag_outside_debug(self):
        if not settings.DEBUG:
            self.assertTrue(settings.SESSION_COOKIE_SECURE)
            self.assertTrue(settings.CSRF_COOKIE_SECURE)

    def test_django_admin_is_not_exposed_in_ci(self):
        if not settings.AELO_ENABLE_DJANGO_ADMIN:
            with self.assertRaises(Resolver404):
                resolve("/admin/")
