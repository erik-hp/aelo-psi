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
