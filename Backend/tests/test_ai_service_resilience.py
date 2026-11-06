"""Failure handling at the Ollama boundary without a running model."""

import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient

from ai_service import main as ai_module


def capture_generation(monkeypatch):
    captured = {}

    async def fake_post(path, payload):
        captured.update(path=path, payload=payload)
        return {"response": "{}"}

    monkeypatch.setattr(ai_module, "_ollama_post", fake_post)
    return captured


def test_generation_sets_context_and_refuses_truncation(monkeypatch):
    captured = capture_generation(monkeypatch)
    assert asyncio.run(ai_module.generate_json({"rules": ["sintetico"]})) == "{}"
    assert captured["path"] == "/api/generate"
    assert captured["payload"]["shift"] is False
    assert captured["payload"]["options"] == {"num_ctx": ai_module.OLLAMA_NUM_CTX}


def test_oversized_prompt_fails_before_reaching_the_model(monkeypatch):
    captured = capture_generation(monkeypatch)
    monkeypatch.setattr(ai_module, "OLLAMA_NUM_CTX", 2048)
    with pytest.raises(ai_module.PromptTooLargeError):
        asyncio.run(ai_module.generate_json({"context": "sintetico " * 1000}))
    assert captured == {}


def test_prompt_at_the_limit_is_still_sent(monkeypatch):
    captured = capture_generation(monkeypatch)
    monkeypatch.setattr(ai_module, "OLLAMA_NUM_CTX", 2048)
    asyncio.run(ai_module.generate_json({"context": "x" * 2900}))
    assert captured["path"] == "/api/generate"


def test_analysis_endpoint_reports_oversized_prompt_as_unavailable(monkeypatch):
    monkeypatch.setattr(ai_module, "AI_SERVICE_TOKEN", "test-service-token")
    monkeypatch.setattr(ai_module, "OLLAMA_NUM_CTX", 2048)
    capture_generation(monkeypatch)
    payload = {
        "patient_id": "patient", "note_id": "target",
        "context": [{"note_id": "target", "created_at": "2026-01-01", "text": "sintetico " * 900}],
    }
    response = TestClient(ai_module.app).post("/analysis", json=payload, headers={"X-AI-Service-Token": "test-service-token"})
    assert response.status_code == 503
    assert "sintetico" not in response.text


def test_circuit_opens_after_three_transport_failures(monkeypatch):
    calls = 0

    async def unavailable(_client, _path, _payload):
        nonlocal calls
        calls += 1
        raise httpx.ConnectError("offline")

    monkeypatch.setattr(ai_module, "_request_ollama", unavailable)
    monkeypatch.setattr(ai_module.app.state, "http_client", object(), raising=False)
    monkeypatch.setattr(ai_module, "_circuit_failures", 0)
    monkeypatch.setattr(ai_module, "_circuit_open_until", 0.0)

    for _ in range(3):
        with pytest.raises(httpx.ConnectError):
            asyncio.run(ai_module._ollama_post("/api/embed", {}))

    with pytest.raises(ai_module.CircuitOpenError):
        asyncio.run(ai_module._ollama_post("/api/embed", {}))
    assert calls == 3


def test_readiness_rejects_missing_required_model(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"models": [{"name": "unrelated:latest"}]}

    class Client:
        async def get(self, _url, timeout):
            assert timeout == 2
            return Response()

    monkeypatch.setattr(ai_module.app.state, "http_client", Client(), raising=False)
    with pytest.raises(ai_module.HTTPException) as error:
        asyncio.run(ai_module.health_ready())
    assert error.value.status_code == 503
    assert error.value.detail["status"] == "not_ready"
