"""Real HTTPS/cookie checks against docker-compose.tls-test.yml, synthetic only."""

import os
import ssl
import time
from pathlib import Path

import httpx


def expect(response, status):
    # Never include response content, tokens or cookies in diagnostics.
    assert response.status_code == status, (response.request.url.path, response.status_code, status)
    return response


def login(client, username):
    response = expect(client.post("/api/auth/login/", json={
        "username": username, "password": "synthetic-only-password-2026",
    }), 200)
    assert "refresh" not in response.json()
    cookie = next(cookie for cookie in client.cookies.jar if cookie.name == "aelo_refresh")
    assert cookie.secure and cookie.path == "/api/auth/"
    assert cookie.has_nonstandard_attr("HttpOnly")
    assert cookie.get_nonstandard_attr("SameSite") == "Strict"
    client.headers["Authorization"] = f"Bearer {response.json()['access']}"
    return cookie.value


def main():
    base = os.environ["AELO_TLS_BASE_URL"]
    http_url = os.environ["AELO_TLS_HTTP_URL"]
    ca_file = Path(os.environ["AELO_TLS_CA_FILE"])
    for attempt in range(60):
        if ca_file.is_file():
            break
        time.sleep(0.5)
    assert ca_file.is_file(), "Disposable test CA was not created"
    context = ssl.create_default_context(cafile=str(ca_file))
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    with httpx.Client(base_url=base, verify=context, timeout=10, follow_redirects=False) as client:
        response = None
        for attempt in range(60):
            try:
                response = client.get("/api/auth/me/")
                if response.status_code == 401:
                    break
            except (httpx.ConnectError, httpx.ReadTimeout):
                pass
            time.sleep(0.5)
        assert response is not None, "HTTPS API did not become available"
        expect(response, 401)
        assert response.headers["strict-transport-security"].startswith("max-age=31536000")
        assert response.headers["cache-control"] == "no-store"
        assert response.headers["x-content-type-options"] == "nosniff", response.headers.get_list("x-content-type-options")
        assert response.headers["x-frame-options"] == "DENY", response.headers.get_list("x-frame-options")
        assert "default-src 'self'" in response.headers["content-security-policy"]
        frontend = expect(client.get("/"), 200)
        assert frontend.headers.get("strict-transport-security", "").startswith("max-age=31536000"), "Frontend HTTPS response lacks HSTS"

        # The caller must trust the test CA; no verify=False shortcut.
        try:
            httpx.get(base, timeout=10, trust_env=False)
        except httpx.ConnectError:
            pass
        else:
            raise AssertionError("Certificate was accepted without trusting the disposable CA")

        redirect = httpx.get(http_url + "/api/auth/me/", timeout=10, follow_redirects=False,
                             headers={"X-Forwarded-Proto": "https"})
        assert redirect.status_code == 308
        assert redirect.headers["location"] == base + "/api/auth/me/"
        # Caddy must overwrite the caller's scheme header, preventing redirect loops.
        expect(client.get("/api/auth/me/", headers={"X-Forwarded-Proto": "http"}), 401)
        expect(client.get("/api/auth/me/", headers={"X-Forwarded-Host": "attacker.example"}), 401)

        expect(client.post("/api/auth/login/", headers={"Origin": "https://attacker.example"},
                           json={"username": "security1_1", "password": "synthetic-only-password-2026"}), 403)
        client.headers["Origin"] = base
        original_refresh = login(client, "security1_1")
        expect(client.get("/api/auth/me/"), 200)
        expect(client.get("/api/patients/"), 200)
        # The frontend's SPA route can return 200 for /admin/; inspect Django itself.
        expect(httpx.get("http://api:8000/admin/", headers={
            "Host": "web-tls-security", "X-Forwarded-Proto": "https",
        }, timeout=10), 404)

        expect(client.post("/api/auth/refresh/", json={}), 403)
        session_headers = {"X-AELO-Session": "1"}
        expect(client.post("/api/auth/refresh/", headers={**session_headers, "Origin": "https://attacker.example"}, json={}), 403)
        refreshed = expect(client.post("/api/auth/refresh/", headers=session_headers, json={}), 200)
        rotated_refresh = client.cookies.get("aelo_refresh")
        assert rotated_refresh and rotated_refresh != original_refresh
        client.headers["Authorization"] = f"Bearer {refreshed.json()['access']}"
        expect(client.post("/api/auth/refresh/", headers={**session_headers,
                    "Cookie": f"aelo_refresh={original_refresh}"}, json={}), 401)
        expect(client.post("/api/auth/logout/", headers=session_headers, json={}), 204)
        assert not client.cookies.get("aelo_refresh")
        expect(client.post("/api/auth/refresh/", headers={**session_headers,
                    "Cookie": f"aelo_refresh={rotated_refresh}"}, json={}), 401)

        # Secure cookies are not sent by the client's cookie jar over HTTP.
        login(client, "security1_1")
        insecure = client.build_request("POST", http_url + "/api/auth/refresh/")
        assert "aelo_refresh" not in insecure.headers.get("Cookie", "")
        own_id = client.get("/api/patients/").json()["results"][0]["id"]
        with httpx.Client(base_url=base, verify=context, headers={"Origin": base}, timeout=10) as other:
            login(other, "security2_1")
            other_id = expect(other.get("/api/patients/"), 200).json()["results"][0]["id"]
            expect(client.get(f"/api/patients/{other_id}/"), 404)
            expect(other.get(f"/api/patients/{own_id}/"), 404)
        login(client, "security1_admin")
        expect(client.get("/api/clinical-notes/"), 200)
        assert client.get("/api/clinical-notes/").json()["count"] == 0
        print("LIVE_TLS_SMOKE_OK: verified CA/hostname, HTTP redirect, HSTS, proxy spoofing, "
              "Secure/HttpOnly/SameSite cookies, origin, rotation/replay/logout, clinic scope, admin denial")


if __name__ == "__main__":
    main()
