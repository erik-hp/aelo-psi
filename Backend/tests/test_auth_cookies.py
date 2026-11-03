import pytest
from rest_framework.test import APIClient
from apps.audit_logs.models import AuditLog


@pytest.mark.django_db
def test_refresh_token_is_http_only_cookie_and_requires_session_header(records):
    client = APIClient()
    login = client.post("/api/auth/login/", {"username": "owner", "password": "unused"}, HTTP_ORIGIN="http://localhost:3000")
    assert login.status_code == 200
    assert "refresh" not in login.data
    cookie = login.cookies["aelo_refresh"]
    assert cookie["httponly"]
    assert cookie["samesite"] == "Strict"
    assert cookie["path"] == "/api/auth/"

    assert client.post("/api/auth/refresh/", {}).status_code == 403
    refreshed = client.post("/api/auth/refresh/", {}, HTTP_X_AELO_SESSION="1", HTTP_ORIGIN="http://localhost:3000")
    assert refreshed.status_code == 200
    assert "access" in refreshed.data
    assert "refresh" not in refreshed.data
    assert refreshed.cookies["aelo_refresh"].value != cookie.value

    assert client.post("/api/auth/refresh/", {}, HTTP_X_AELO_SESSION="1", HTTP_ORIGIN="https://attacker.example").status_code == 403
    assert client.post("/api/auth/refresh/", {}, HTTP_X_AELO_SESSION="1").status_code == 403

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
    profile = client.get("/api/auth/me/")
    assert profile.status_code == 200
    assert profile.data["username"] == "owner"
    logout = client.post("/api/auth/logout/", {}, HTTP_X_AELO_SESSION="1", HTTP_ORIGIN="http://localhost:3000")
    assert logout.status_code == 204
    assert logout.cookies["aelo_refresh"].value == ""


@pytest.mark.django_db
def test_failed_login_is_audited_without_recording_credentials(records):
    response = APIClient().post("/api/auth/login/", {"username": "owner", "password": "wrong-secret"}, HTTP_ORIGIN="http://localhost:3000")
    assert response.status_code == 401
    event = AuditLog.objects.get(action="LOGIN_FAILED")
    assert "wrong-secret" not in str(event.metadata)


@pytest.mark.django_db
def test_login_rejects_cross_site_origin(records):
    client = APIClient()
    denied = client.post("/api/auth/login/", {"username": "owner", "password": "unused"}, HTTP_ORIGIN="https://attacker.example")
    assert denied.status_code == 403
    assert "aelo_refresh" not in denied.cookies
