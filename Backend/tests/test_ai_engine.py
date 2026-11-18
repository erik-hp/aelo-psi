"""Engine selection: Claude is a test engine and must stay behind the synthetic flag."""
import asyncio
import subprocess

import pytest

from ai_service import claude_cli
from ai_service import main as ai_module
from ai_service.schemas import GraphFact


def item(note_id, text="texto", tier="near"):
    return ai_module.ContextItem(note_id=note_id, created_at="2026-01-01", text=text, tier=tier)


def fact(index):
    return GraphFact(source=f"a{index}", relation="associated", target=f"b{index}", evidence="e", note_id="n", observed_at="2026-01-01")


def forbid_embeddings(_texts):
    raise AssertionError("Claude engine must not request embeddings.")


@pytest.fixture
def claude_engine(monkeypatch):
    monkeypatch.setattr(ai_module, "AI_ENGINE", "claude-cli")
    monkeypatch.setattr(ai_module, "embed_texts", forbid_embeddings)


@pytest.mark.parametrize("synthetic", ["", "False", "no"])
def test_claude_engine_requires_declared_synthetic_environment(synthetic):
    with pytest.raises(RuntimeError):
        ai_module.validate_engine("claude-cli", synthetic)


def test_claude_engine_starts_in_synthetic_environment():
    ai_module.validate_engine("claude-cli", "True")


def test_ollama_needs_no_declaration():
    ai_module.validate_engine("ollama", "")


def test_unknown_engine_is_refused():
    with pytest.raises(RuntimeError):
        ai_module.validate_engine("outro", "True")


def test_generation_uses_the_selected_engine(monkeypatch):
    monkeypatch.setattr(ai_module, "AI_ENGINE", "claude-cli")

    async def fake_generate(prompt):
        return '{"ok": "' + prompt["task"] + '"}'

    async def forbid_ollama(_path, _payload):
        raise AssertionError("Ollama must not be called.")

    monkeypatch.setattr(ai_module.claude_cli, "generate", fake_generate)
    monkeypatch.setattr(ai_module, "_ollama_post", forbid_ollama)
    assert asyncio.run(ai_module.generate_json({"task": "t"})) == '{"ok": "t"}'


def test_oversized_prompt_is_refused_by_any_engine(monkeypatch):
    monkeypatch.setattr(ai_module, "AI_ENGINE", "claude-cli")
    monkeypatch.setattr(ai_module, "OLLAMA_NUM_CTX", 2048)
    with pytest.raises(ai_module.PromptTooLargeError):
        asyncio.run(ai_module.generate_json({"context": "x " * 5000}))


def test_retrieval_keeps_far_notes_and_recent_order_without_embeddings(claude_engine, monkeypatch):
    monkeypatch.setattr(ai_module, "RAG_TOP_K", 3)
    payload = ai_module.AnalysisRequest(
        patient_id="p", note_id="target",
        context=[item("target"), item("remote", tier="far"), item("recent-1"), item("recent-2")],
    )
    selected = asyncio.run(ai_module.retrieve_context(payload))
    assert [note.note_id for note in selected.context] == ["target", "remote", "recent-1"]


def test_graph_context_is_trimmed_without_embeddings(claude_engine):
    payload = ai_module.AnalysisRequest(patient_id="p", note_id="t", context=[item("t")], graph_context=[fact(index) for index in range(20)])
    selected = asyncio.run(ai_module.retrieve_graph_context(payload))
    assert len(selected.graph_context) == 12
    assert selected.graph_context[0].source == "a0"


def test_analysis_prompt_describes_required_sources(monkeypatch):
    captured = {}

    async def fake_generate(prompt):
        captured.update(prompt)
        raise ValueError("stop")

    monkeypatch.setattr(ai_module, "generate_json", fake_generate)
    payload = ai_module.AnalysisRequest(patient_id="p", note_id="t", context=[item("t")])
    with pytest.raises(ValueError):
        asyncio.run(ai_module.ollama_analysis(payload))
    assert "note_id" in str(captured["schema"]["sources"])
    assert "exact" in captured["task"]


@pytest.mark.parametrize("output, expected", [('{"a": 1}', '{"a": 1}'), ('Aqui está:\n```json\n{"a": 1}\n```', '{"a": 1}')])
def test_claude_output_is_reduced_to_the_json_object(output, expected):
    assert claude_cli.extract_json_object(output) == expected


def test_claude_output_without_json_is_an_error():
    with pytest.raises(ValueError):
        claude_cli.extract_json_object("Não consigo responder.")


def test_claude_failure_does_not_expose_the_note(monkeypatch):
    monkeypatch.setattr(claude_cli.shutil, "which", lambda _name: "claude")
    monkeypatch.setattr(claude_cli.subprocess, "run", lambda *a, **k: subprocess.CompletedProcess(a, 1, b"", b"texto clinico sintetico"))
    with pytest.raises(ValueError) as failure:
        claude_cli.run_claude("texto clinico sintetico")
    assert "texto clinico" not in str(failure.value)


def test_claude_runs_without_tools_and_outside_the_project(monkeypatch, tmp_path):
    seen = {}

    def fake_run(command, cwd, **_kwargs):
        seen.update(command=command, cwd=cwd)
        return subprocess.CompletedProcess(command, 0, b"{}", b"")

    monkeypatch.setattr(claude_cli.shutil, "which", lambda _name: "claude")
    monkeypatch.setattr(claude_cli.subprocess, "run", fake_run)
    claude_cli.run_claude("{}")
    assert seen["command"][seen["command"].index("--tools") + 1] == ""
    assert "Backend" not in seen["cwd"]


@pytest.mark.parametrize("engine", ["gemini", "anthropic"])
@pytest.mark.parametrize("synthetic", ["", "False", "no"])
def test_frontier_http_engines_require_declared_synthetic_environment(engine, synthetic):
    with pytest.raises(RuntimeError):
        ai_module.validate_engine(engine, synthetic)


@pytest.mark.parametrize("engine", ["gemini", "anthropic"])
def test_frontier_http_engines_start_in_synthetic_environment(engine):
    ai_module.validate_engine(engine, "True")


def test_gemini_sends_key_in_header_never_url_and_extracts_json(monkeypatch):
    import httpx
    from ai_service import frontier_providers

    monkeypatch.setenv("GEMINI_API_KEY", "synthetic-gemini-key-test")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-pro")
    captured = {}

    class FakeClient:
        async def post(self, url, headers, json):
            captured.update(url=url, headers=headers, json=json)
            return httpx.Response(
                200,
                json={"candidates": [{"content": {"parts": [{"text": '{"patterns": ["insônia"]}'}]}}]},
                request=httpx.Request("POST", url),
            )

    monkeypatch.setattr(ai_module, "AI_ENGINE", "gemini")
    ai_module.app.state.http_client = FakeClient()
    try:
        out = asyncio.run(ai_module.generate_json({"task": "synthetic"}))
    finally:
        ai_module.app.state._state.pop("http_client", None)
    assert out == '{"patterns": ["insônia"]}'
    assert "synthetic-gemini-key-test" not in captured["url"]
    assert captured["headers"]["x-goog-api-key"] == "synthetic-gemini-key-test"
    assert captured["json"]["generationConfig"]["responseMimeType"] == "application/json"
    assert frontier_providers.check_ready("gemini") == ["gemini-2.5-pro"]


def test_gemini_embeddings_work_when_enabled_and_reject_invalid_vectors(monkeypatch):
    import httpx

    monkeypatch.setenv("GEMINI_API_KEY", "synthetic-gemini-key-test")
    monkeypatch.setenv("GEMINI_USE_EMBEDDINGS", "True")
    monkeypatch.setattr(ai_module, "AI_ENGINE", "gemini")
    assert ai_module.has_embeddings() is True

    class FakeClient:
        async def post(self, url, headers, json):
            return httpx.Response(
                200,
                json={"embeddings": [{"values": [0.1, 0.2, 0.3]}, {"values": [0.4, 0.5, 0.6]}]},
                request=httpx.Request("POST", url),
            )

    ai_module.app.state.http_client = FakeClient()
    try:
        vectors = asyncio.run(ai_module.embed_texts(["sono", "ansiedade"]))
    finally:
        ai_module.app.state._state.pop("http_client", None)
    assert vectors == [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]


def test_anthropic_sends_key_in_header_and_never_leaks_prompt_or_key_on_failure(monkeypatch):
    import httpx

    monkeypatch.setenv("ANTHROPIC_API_KEY", "synthetic-anthropic-secret-key")
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    monkeypatch.setattr(ai_module, "AI_ENGINE", "anthropic")

    class FailingClient:
        async def post(self, url, headers, json):
            return httpx.Response(429, text="rate limit: texto clinico confidencial synthetic-anthropic-secret-key", request=httpx.Request("POST", url))

    class OkClient:
        async def post(self, url, headers, json):
            assert headers["x-api-key"] == "synthetic-anthropic-secret-key"
            assert "synthetic-anthropic-secret-key" not in url
            return httpx.Response(
                200,
                json={"content": [{"type": "text", "text": '```json\n{"nodes": [], "edges": []}\n```'}]},
                request=httpx.Request("POST", url),
            )

    try:
        ai_module.app.state.http_client = FailingClient()
        with pytest.raises(ValueError) as failure:
            asyncio.run(ai_module.generate_json({"note": "texto clinico confidencial"}))
        assert "texto clinico" not in str(failure.value)
        assert "synthetic-anthropic-secret-key" not in str(failure.value)

        ai_module.app.state.http_client = OkClient()
        assert asyncio.run(ai_module.generate_json({"note": "ok"})) == '{"nodes": [], "edges": []}'
    finally:
        ai_module.app.state._state.pop("http_client", None)


def test_frontier_engines_disallow_untrusted_http_base_url(monkeypatch):
    from ai_service import frontier_providers

    monkeypatch.setenv("GEMINI_API_KEY", "synthetic-key")
    monkeypatch.setenv("GEMINI_BASE_URL", "http://evil.example.com/v1beta")
    with pytest.raises(ValueError):
        frontier_providers.check_ready("gemini")
