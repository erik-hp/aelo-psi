"""Start the AI service on this computer with an external test engine (claude-cli, gemini, or anthropic).

Synthetic notes only (ADR-004 / SC-IA-01). Run from Backend:
    .venv/Scripts/python.exe scripts/run_ai_claude.py
    .venv/Scripts/python.exe scripts/run_ai_claude.py --engine gemini
    .venv/Scripts/python.exe scripts/run_ai_claude.py --engine anthropic
"""
import argparse
import os
from pathlib import Path

import uvicorn

BACKEND = Path(__file__).resolve().parent.parent


def read_env(path: Path) -> dict[str, str]:
    pairs = (line.split("=", 1) for line in path.read_text(encoding="utf-8").splitlines() if "=" in line and not line.startswith("#"))
    return {key.strip(): value.strip() for key, value in pairs}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", choices=("claude-cli", "gemini", "anthropic"), default=None)
    args = parser.parse_args()
    settings = read_env(BACKEND / ".env")
    if settings.get("AELO_SYNTHETIC_DATA_ONLY", "").lower() != "true":
        raise SystemExit("Defina AELO_SYNTHETIC_DATA_ONLY=True em Backend/.env: este modo aceita só notas sintéticas.")
    engine = args.engine or settings.get("AI_ENGINE", "claude-cli")
    if engine == "ollama":
        engine = "claude-cli"
    forwarded = {
        key: settings[key]
        for key in ("AI_SERVICE_TOKEN", "GEMINI_API_KEY", "GEMINI_MODEL", "GEMINI_EMBED_MODEL", "GEMINI_USE_EMBEDDINGS", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "AI_CLAUDE_MODEL", "AI_MAX_CONTEXT_TOKENS")
        if key in settings
    }
    os.environ.update(forwarded, AI_ENGINE=engine, AELO_SYNTHETIC_DATA_ONLY="True")
    os.chdir(BACKEND)
    uvicorn.run("ai_service.main:app", app_dir=str(BACKEND), host="127.0.0.1", port=8001)
