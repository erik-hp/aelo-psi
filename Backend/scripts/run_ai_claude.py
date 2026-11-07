"""Start the AI service on this computer with Claude as a test engine.

Synthetic notes only (ADR-004). The Claude CLI exists on the host, not in the
containers, so this replaces the `ai-service` container during local tests.

Run from Backend: .venv/Scripts/python.exe scripts/run_ai_claude.py
"""
import os
from pathlib import Path

import uvicorn

BACKEND = Path(__file__).resolve().parent.parent


def read_env(path: Path) -> dict[str, str]:
    pairs = (line.split("=", 1) for line in path.read_text(encoding="utf-8").splitlines() if "=" in line and not line.startswith("#"))
    return {key.strip(): value.strip() for key, value in pairs}


if __name__ == "__main__":
    settings = read_env(BACKEND / ".env")
    if settings.get("AELO_SYNTHETIC_DATA_ONLY", "").lower() != "true":
        raise SystemExit("Defina AELO_SYNTHETIC_DATA_ONLY=True em Backend/.env: este modo aceita só notas sintéticas.")
    os.environ.update(AI_ENGINE="claude-cli", AELO_SYNTHETIC_DATA_ONLY="True", AI_SERVICE_TOKEN=settings["AI_SERVICE_TOKEN"])
    os.chdir(BACKEND)
    uvicorn.run("ai_service.main:app", app_dir=str(BACKEND), host="0.0.0.0", port=8001)
