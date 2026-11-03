"""Exercise Django's HTTP client against the actual FastAPI route schemas."""

import pytest
import requests
from fastapi.testclient import TestClient

from ai_service import main as ai_module
from services.ai.client import AIClient, AIServiceError


def _bridge(monkeypatch):
    monkeypatch.setattr(ai_module, "AI_SERVICE_TOKEN", "contract-token")
    from django.conf import settings
    monkeypatch.setattr(settings, "AI_SERVICE_TOKEN", "contract-token")
    client = TestClient(ai_module.app)

    def post(url, json, headers, timeout):
        response = client.post(url.removeprefix(settings.AI_SERVICE_URL.rstrip("/")), json=json, headers=headers)

        class Result:
            def raise_for_status(self):
                if response.status_code >= 400:
                    raise requests.HTTPError(str(response.status_code))

            def json(self):
                return response.json()

        return Result()

    monkeypatch.setattr(requests, "post", post)


def test_vault_extract_contract_accepts_literal_evidence(monkeypatch, settings):
    _bridge(monkeypatch)

    async def extract(_note):
        return ai_module.VaultExtraction(nodes=[{"kind": "symptom", "label": "insônia", "evidence": "Relata insônia"}], edges=[])

    async def embeddings(_texts):
        return [[0.1, 0.2]]

    monkeypatch.setattr(ai_module, "ollama_vault", extract)
    monkeypatch.setattr(ai_module, "embed_texts", embeddings)
    result = AIClient().request_vault({"note": {"note_id": "note", "created_at": "2026-11-02", "text": "Relata insônia."}})
    assert result["nodes"][0]["embedding"] == [0.1, 0.2]


def test_vault_extract_contract_rejects_invented_evidence(monkeypatch, settings):
    _bridge(monkeypatch)

    async def extract(_note):
        return ai_module.VaultExtraction(nodes=[{"kind": "symptom", "label": "insônia", "evidence": "inventado"}], edges=[])

    monkeypatch.setattr(ai_module, "ollama_vault", extract)
    with pytest.raises(AIServiceError):
        AIClient().request_vault({"note": {"note_id": "note", "created_at": "2026-11-02", "text": "Relata insônia."}})
