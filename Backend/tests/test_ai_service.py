import asyncio

import pytest
from fastapi.testclient import TestClient

from ai_service import main as ai_module


def test_analysis_requires_service_token(monkeypatch):
    monkeypatch.setattr(ai_module, "AI_SERVICE_TOKEN", "test-service-token")
    client = TestClient(ai_module.app)
    payload = {"patient_id": "patient", "context": [{"note_id": "note", "created_at": "2026-11-02", "text": "context"}]}

    assert client.post("/analysis", json=payload).status_code == 403
    assert client.post("/analysis", json=payload, headers={"X-AI-Service-Token": "wrong"}).status_code == 403


def test_analysis_only_returns_excerpts_from_supplied_context(monkeypatch):
    monkeypatch.setattr(ai_module, "AI_SERVICE_TOKEN", "test-service-token")

    async def model_result(_payload):
        return {
            "patterns": ["pattern"],
            "sources": [
                {"note_id": "note-1", "excerpt": "allowed excerpt", "relevance_score": 0.9},
                {"note_id": "note-1", "excerpt": "invented excerpt", "relevance_score": 0.9},
                {"note_id": "other-note", "excerpt": "allowed excerpt", "relevance_score": 0.9},
            ],
        }

    monkeypatch.setattr(ai_module, "ollama_analysis", model_result)
    response = TestClient(ai_module.app).post(
        "/analysis",
        json={
            "patient_id": "patient",
            "context": [{"note_id": "note-1", "session_id": "session-1", "created_at": "2026-11-02", "text": "Some allowed excerpt here."}],
        },
        headers={"X-AI-Service-Token": "test-service-token"},
    )

    assert response.status_code == 200
    assert response.json()["sources"] == [
        {"note_id": "note-1", "session_id": "session-1", "excerpt": "allowed excerpt", "relevance_score": 0.9}
    ]


def test_model_failure_does_not_create_a_clinical_result(monkeypatch, caplog):
    monkeypatch.setattr(ai_module, "AI_SERVICE_TOKEN", "test-service-token")

    async def unavailable(_payload):
        raise ValueError("model unavailable SECRET-CLINICAL-TEXT")

    monkeypatch.setattr(ai_module, "ollama_analysis", unavailable)
    response = TestClient(ai_module.app).post(
        "/analysis",
        json={"patient_id": "patient", "context": [{"note_id": "note", "created_at": "2026-11-02", "text": "context"}]},
        headers={"X-AI-Service-Token": "test-service-token"},
    )

    assert response.status_code == 503
    assert "patterns" not in response.json()
    assert "SECRET-CLINICAL-TEXT" not in caplog.text
    assert "SECRET-CLINICAL-TEXT" not in response.text


def test_retrieval_keeps_target_and_ranks_other_notes(monkeypatch):
    monkeypatch.setattr(ai_module, "RAG_TOP_K", 2)

    async def vectors(_texts):
        return [[1.0, 0.0], [0.1, 0.9], [0.9, 0.1]]

    monkeypatch.setattr(ai_module, "embed_texts", vectors)
    payload = ai_module.AnalysisRequest(
        patient_id="patient", note_id="target",
        context=[
            ai_module.ContextItem(note_id="target", created_at="2026-01-01", text="target"),
            ai_module.ContextItem(note_id="unrelated", created_at="2026-01-02", text="unrelated"),
            ai_module.ContextItem(note_id="related", created_at="2026-01-03", text="related"),
        ],
    )
    selected = asyncio.run(ai_module.retrieve_context(payload))
    assert [item.note_id for item in selected.context] == ["target", "related"]


def test_sources_outside_retrieved_context_are_rejected(monkeypatch):
    monkeypatch.setattr(ai_module, "AI_SERVICE_TOKEN", "test-service-token")

    async def selected(payload):
        return payload.model_copy(update={"context": payload.context[:1]})

    async def model_result(_payload):
        return {"patterns": ["pattern"], "sources": [
            {"note_id": "selected", "excerpt": "selected words", "relevance_score": 0.9},
            {"note_id": "excluded", "excerpt": "excluded words", "relevance_score": 0.9},
        ]}

    monkeypatch.setattr(ai_module, "retrieve_context", selected)
    monkeypatch.setattr(ai_module, "ollama_analysis", model_result)
    response = TestClient(ai_module.app).post(
        "/analysis",
        json={"patient_id": "patient", "context": [
            {"note_id": "selected", "created_at": "2026-01-01", "text": "selected words"},
            {"note_id": "excluded", "created_at": "2026-01-02", "text": "excluded words"},
        ]},
        headers={"X-AI-Service-Token": "test-service-token"},
    )
    assert response.status_code == 200
    assert response.json()["retrieved_note_ids"] == ["selected"]
    assert [source["note_id"] for source in response.json()["sources"]] == ["selected"]


def test_malformed_embedding_response_fails_closed(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"embeddings": [123]}

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            pass

        async def post(self, *_args, **_kwargs):
            return FakeResponse()

    monkeypatch.setattr(ai_module.httpx, "AsyncClient", FakeClient)
    with pytest.raises(ValueError, match="embedding vectors"):
        asyncio.run(ai_module.embed_texts(["clinical text"]))


def test_vault_extraction_rejects_invented_evidence(monkeypatch):
    monkeypatch.setattr(ai_module, "AI_SERVICE_TOKEN", "test-service-token")

    async def invented(_note):
        return ai_module.VaultExtraction(nodes=[{"kind": "symptom", "label": "insônia", "evidence": "não está na nota"}], edges=[])

    monkeypatch.setattr(ai_module, "ollama_vault", invented)
    response = TestClient(ai_module.app).post(
        "/vault/extract",
        json={"note": {"note_id": "note", "created_at": "2026-11-02", "text": "Relata insônia."}},
        headers={"X-AI-Service-Token": "test-service-token"},
    )
    assert response.status_code == 503


def test_vault_synthesis_rejects_unsupported_claim(monkeypatch):
    monkeypatch.setattr(ai_module, "AI_SERVICE_TOKEN", "test-service-token")

    async def invented(_payload):
        return ai_module.VaultSynthesis(claims=[{"kind": "global", "text": "Narrative", "note_id": "other", "excerpt": "invented"}])

    monkeypatch.setattr(ai_module, "ollama_vault_synthesis", invented)
    response = TestClient(ai_module.app).post(
        "/vault/synthesize",
        json={"current": [{"note_id": "note", "excerpt": "literal"}], "history": []},
        headers={"X-AI-Service-Token": "test-service-token"},
    )
    assert response.status_code == 503
