"""Failure handling at the Ollama boundary without a running model."""

import asyncio
import json

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


def graph_of(nodes, edges):
    return ai_module.VaultExtraction(
        nodes=[{"kind": kind, "label": label, "evidence": evidence} for kind, label, evidence in nodes],
        edges=[{"source": source, "target": target, "relation": relation, "evidence": evidence, "confidence": 0.8} for source, target, relation, evidence in edges],
    )


NOTE_TEXT = "Relata insônia desde a demissão e evita a casa antiga."


def test_invalid_concept_is_dropped_without_losing_the_rest_of_the_note():
    extraction = graph_of(
        [("symptom", "insônia", "insônia"), ("event", "evitação da casa", "evita a casa antiga"), ("event", "demissão", "demissão")],
        [(0, 2, "associated", "insônia desde a demissão"), (0, 1, "associated", "insônia desde a demissão")],
    )
    kept = ai_module.literal_graph(extraction, NOTE_TEXT)
    assert [node.label for node in kept.nodes] == ["insônia", "demissão"]
    assert [(edge.source, edge.target) for edge in kept.edges] == [(0, 1)]


def test_concept_without_literal_evidence_is_never_kept():
    extraction = graph_of([("symptom", "insônia", "frase que a nota não contém")], [])
    assert ai_module.literal_graph(extraction, NOTE_TEXT).nodes == []


def test_invented_concept_and_unsupported_types_are_dropped():
    extraction = graph_of(
        [("symptom", "depressão maior", "insônia"), ("diagnosis", "insônia", "insônia"), ("symptom", "insônia", "insônia"), ("event", "demissão", "demissão")],
        [(2, 3, "causes", "insônia desde a demissão"), (2, 3, "associated", "trecho inventado"), (2, 2, "associated", "insônia")],
    )
    kept = ai_module.literal_graph(extraction, NOTE_TEXT)
    assert [node.label for node in kept.nodes] == ["insônia", "demissão"]
    assert kept.edges == []


DENIAL_NOTE = (
    "Nega ideação suicida e uso de álcool. Segue sem pensamentos de morte. Não há relato de pânico; pergunto diretamente. "
    "Voltou na terça, sem dormir. Não conseguiu dormir de novo. Nega ideação suicida, mas relata insônia."
)


def test_denied_findings_are_not_kept_but_real_ones_are():
    labels = ["ideação suicida", "uso de álcool", "pensamentos de morte", "pânico", "sem dormir", "Não conseguiu dormir", "insônia", "Nega ideação suicida"]
    extraction = graph_of([("symptom", label, label) for label in labels], [])
    kept = [node.label for node in ai_module.literal_graph(extraction, DENIAL_NOTE).nodes]
    assert kept == ["sem dormir", "Não conseguiu dormir", "insônia"]


def test_other_denial_forms_are_dropped():
    text = "Jamais pensou em fugir. Descarta ideação suicida. Pânico: negado. Nunca teve alucinações. Sem nenhum uso de drogas. Não sentiu tristeza. Chorou muito."
    labels = ["fugir", "ideação suicida", "Pânico", "alucinações", "uso de drogas", "tristeza", "Chorou muito"]
    extraction = graph_of([("symptom", label, label) for label in labels], [])
    assert [node.label for node in ai_module.literal_graph(extraction, text).nodes] == ["Chorou muito"]


def test_split_note_is_exact_and_bounded():
    text = " ".join(f"Frase número {i} com algum conteúdo clínico." for i in range(200))
    chunks = ai_module.split_note(text)
    assert len(chunks) > 5 and all(chunk in text for chunk in chunks)
    assert max(map(len, chunks)) <= 950 and "".join(chunks).replace(" ", "") == text.replace(" ", "")


def test_long_note_is_read_in_chunks_and_merged(monkeypatch):
    text = " ".join(f"Relata sintoma{i} na sessão." for i in range(120))
    calls = []

    async def fake_generate(prompt):
        chunk = prompt["note"]["text"]
        calls.append(len(chunk))
        first = chunk.split()[1]
        return json.dumps({"nodes": [{"kind": "symptom", "label": first, "evidence": f"Relata {first}"}, {"kind": "symptom", "label": "sintoma0", "evidence": "Relata sintoma0"}], "edges": []})

    monkeypatch.setattr(ai_module, "generate_json", fake_generate)
    result = asyncio.run(ai_module.ollama_vault(ai_module.ContextItem(note_id="n", created_at="2026-01-01", text=text)))
    assert len(calls) > 1 and max(calls) <= 950
    assert len(result.nodes) == len({node.label for node in result.nodes}) >= len(calls)
    assert all(node.label in text for node in result.nodes)


def test_extraction_prompt_requires_exact_copies(monkeypatch):
    captured = {}

    async def fake_generate(prompt):
        captured.update(prompt)
        return "{}"

    monkeypatch.setattr(ai_module, "generate_json", fake_generate)
    asyncio.run(ai_module.ollama_vault(ai_module.ContextItem(note_id="n", created_at="2026-01-01", text=NOTE_TEXT)))
    assert "character by character" in captured["task"] and captured["response_schema"]
