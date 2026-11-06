"""Isolated database settings for the project's automated tests."""

import os
from base64 import urlsafe_b64encode

os.environ["DJANGO_SECRET_KEY"] = "test-only-secret-for-automated-tests-please-do-not-deploy-1234567890"
os.environ["CLINICAL_DATA_KEYS"] = urlsafe_b64encode(b"0" * 32).decode("ascii")
os.environ["AUDIT_LOG_HMAC_KEY"] = "test-only-audit-hmac-key-do-not-deploy-1234567890"
os.environ["POSTGRES_PASSWORD"] = "test-only-unused-with-sqlite"

from .settings import *  # noqa: F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
