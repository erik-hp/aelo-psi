"""HTTP security smoke against the synthetic Compose stack."""

import os
import time

import httpx


BASE = os.environ["AELO_SECURITY_BASE_URL"].rstrip("/")
WEB = os.environ["AELO_SECURITY_WEB_URL"].rstrip("/")
ORIGIN = "http://localhost:3000"


def login(username):
    client = httpx.Client(base_url=BASE, timeout=10, headers={"Origin": ORIGIN})
    response = client.post("/api/auth/login/", json={"username": username, "password": "synthetic-only-password-2026"})
    assert response.status_code == 200, (username, response.status_code)
    assert "refresh" not in response.json()
    assert "httponly" in response.headers["set-cookie"].lower()
    client.headers["Authorization"] = f"Bearer {response.json()['access']}"
    return client


def refresh(client, origin=None):
    # The synthetic stack serves HTTP while production cookies are Secure.
    # Supply the test cookie explicitly to exercise the server-side flow.
    token = client.cookies.get("aelo_refresh")
    headers = {"X-AELO-Session": "1", "Cookie": f"aelo_refresh={token}"}
    if origin:
        headers["Origin"] = origin
    return client.post("/api/auth/refresh/", headers=headers, json={})


def main():
    for attempt in range(30):
        try:
            first = login("security1_1")
            break
        except (httpx.ConnectError, httpx.ReadTimeout):
            if attempt == 29:
                raise
            time.sleep(1)
    second = login("security2_1")
    admin = login("security1_admin")
    try:
        own = first.get("/api/patients/")
        other = second.get("/api/patients/")
        assert own.status_code == other.status_code == 200
        own_id = own.json()["results"][0]["id"]
        other_id = other.json()["results"][0]["id"]
        assert first.get(f"/api/patients/{other_id}/").status_code == 404
        assert second.get(f"/api/patients/{own_id}/").status_code == 404
        assert admin.get(f"/api/patients/{other_id}/").status_code == 404
        assert admin.get(f"/api/patients/{own_id}/").status_code == 200
        users = admin.get("/api/users/")
        assert users.status_code == 200
        admin_clinic = admin.get("/api/auth/me/").json()["clinic_id"]
        assert all(user["clinic"] == admin_clinic for user in users.json()["results"])
        own_graph = first.get(f"/api/vault/patients/{own_id}/")
        assert own_graph.status_code == 200 and len(own_graph.json()["nodes"]) in {100, 200}
        assert first.get(f"/api/vault/patients/{other_id}/").status_code in {403, 404}
        assert admin.get(f"/api/vault/patients/{other_id}/").status_code in {403, 404}
        assert own.headers["cache-control"] == "no-store"
        for web_attempt in range(30):
            try:
                web = httpx.get(WEB + "/", timeout=10)
                break
            except httpx.ConnectError:
                if web_attempt == 29:
                    raise
                time.sleep(1)
        assert web.status_code == 200
        assert "default-src 'self'" in web.headers["content-security-policy"]
        assert web.headers["x-content-type-options"] == "nosniff"
        assert web.headers["cross-origin-opener-policy"] == "same-origin"
        assert web.headers["cross-origin-embedder-policy"] == "require-corp"
        assert web.headers["cross-origin-resource-policy"] == "same-origin"
        assert httpx.get(WEB + "/api/patients/", timeout=10).status_code == 401
        with httpx.Client(base_url=WEB, timeout=10, headers={"Origin": WEB}) as proxied:
            browser_login = proxied.post("/api/auth/login/", json={
                "username": "security1_admin", "password": "synthetic-only-password-2026",
            })
            assert browser_login.status_code == 200
            assert "httponly" in browser_login.headers["set-cookie"].lower()
            proxied.headers["Authorization"] = f"Bearer {browser_login.json()['access']}"
            assert proxied.get("/api/patients/").status_code == 200
            assert refresh(proxied).status_code == 200
        assert first.get("/api/auth/me/").json()["username"] == "security1_1"
        draft_path = f"/api/clinical-notes/drafts/{own_id}/"
        payload = {"title": "Synthetic title", "content": "Synthetic clinical draft", "version": 0}
        assert first.delete(draft_path).status_code == 204
        assert first.put(draft_path, json=payload).status_code == 200
        assert first.put(draft_path, json=payload).status_code == 409
        assert second.get(draft_path).status_code == 404
        assert first.get(draft_path).json()["content"] == payload["content"]
        unsafe = first.post("/api/clinical-notes/preview-ai/", json={"patient": own_id, "text": "mãe Ana Pereira relatou melhora"})
        assert unsafe.status_code == 422 and "Ana Pereira" not in unsafe.text
        safe = first.post("/api/clinical-notes/preview-ai/", json={"patient": own_id, "text": "Paciente relatou melhora no sono."})
        assert safe.status_code == 200
        foreign = refresh(first, origin="https://attacker.example")
        assert foreign.status_code == 403
        assert refresh(first).status_code == 200
        assert first.delete(draft_path).status_code == 204
        assert first.get(draft_path).status_code == 404
        print("LIVE_SECURITY_SMOKE_OK: clinic and graph isolation, draft, preview, cookies, origin, cache, proxy headers")
    finally:
        first.close()
        second.close()
        admin.close()


if __name__ == "__main__":
    main()
