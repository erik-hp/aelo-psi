"""Production settings must fail closed; these run the real module in a clean process."""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
PROBE = """
import json
from config import settings as s
print(json.dumps({
    "cors": s.CORS_ALLOWED_ORIGINS,
    "csrf": s.CSRF_TRUSTED_ORIGINS,
    "proxy": getattr(s, "SECURE_PROXY_SSL_HEADER", None),
}))
"""
MANAGED_PREFIXES = ("DJANGO_", "POSTGRES_", "CORS_", "CSRF_", "CLINICAL_", "AUDIT_", "AI_SERVICE_")
SYNTHETIC_PASSWORD = "synthetic-strong-database-password"


def load_settings(**overrides):
    env = {key: value for key, value in os.environ.items() if not key.startswith(MANAGED_PREFIXES)}
    env.update({
        "DJANGO_SECRET_KEY": "synthetic-settings-probe-secret-not-used-anywhere-1234567890",
        "POSTGRES_PASSWORD": SYNTHETIC_PASSWORD,
        **overrides,
    })
    return subprocess.run(
        [sys.executable, "-c", PROBE], cwd=BACKEND, env=env, capture_output=True, text=True, timeout=60,
    )


def loaded(**overrides):
    result = load_settings(**overrides)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


@pytest.mark.parametrize("password", ["", "aelo", "postgres", "password", "short-pass", "replace-with-a-random-database-password"])
def test_production_refuses_weak_database_password(password):
    result = load_settings(POSTGRES_PASSWORD=password)
    assert result.returncode != 0
    assert "POSTGRES_PASSWORD" in result.stderr


def test_production_accepts_strong_database_password():
    assert load_settings().returncode == 0


def test_development_keeps_working_without_a_strong_password():
    assert loaded(DJANGO_DEBUG="True", POSTGRES_PASSWORD="aelo")["cors"] == ["http://localhost:3000"]


def test_production_has_no_implicit_browser_origin():
    settings = loaded()
    assert settings["cors"] == []
    assert settings["csrf"] == []


def test_configured_origins_tolerate_spaces_after_commas():
    settings = loaded(CORS_ALLOWED_ORIGINS="https://a.example.test, https://b.example.test,")
    assert settings["cors"] == ["https://a.example.test", "https://b.example.test"]


def test_proxy_scheme_header_is_trusted_only_when_explicitly_enabled():
    assert loaded()["proxy"] is None
    assert loaded(DJANGO_TRUST_PROXY_HEADERS="True")["proxy"] == ["HTTP_X_FORWARDED_PROTO", "https"]


def test_proxy_variable_matches_the_tls_overlay_and_env_example():
    # Without this header Django sees plain HTTP behind Caddy and redirects forever.
    assert 'DJANGO_TRUST_PROXY_HEADERS: "True"' in (BACKEND / "docker-compose.tls.yml").read_text(encoding="utf-8")
    assert "DJANGO_TRUST_PROXY_HEADERS=" in (BACKEND / ".env.example").read_text(encoding="utf-8")


def test_automatic_reading_refuses_an_environment_not_declared_synthetic():
    result = load_settings(AI_AUTO_EXTRACTION="True")
    assert result.returncode != 0
    assert "AELO_SYNTHETIC_DATA_ONLY" in result.stderr


def test_automatic_reading_runs_only_when_declared_synthetic():
    assert load_settings(AI_AUTO_EXTRACTION="True", AELO_SYNTHETIC_DATA_ONLY="True").returncode == 0


def test_automatic_reading_never_starts_in_https_deployment():
    result = load_settings(
        AI_AUTO_EXTRACTION="True", AELO_SYNTHETIC_DATA_ONLY="True", DJANGO_REQUIRE_HTTPS="True",
        CLINICAL_DATA_KEYS="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=", AUDIT_LOG_HMAC_KEY="a" * 40, AI_SERVICE_TOKEN="b" * 40,
    )
    assert result.returncode != 0
    assert "AELO_SYNTHETIC_DATA_ONLY" in result.stderr
