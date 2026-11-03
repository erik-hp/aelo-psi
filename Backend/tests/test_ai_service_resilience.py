"""Failure handling at the Ollama boundary without a running model."""

import asyncio

import httpx
import pytest

from ai_service import main as ai_module


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
