"""Claude as a test engine for synthetic notes only (ADR-004).

Runs a fresh `claude -p` with no tools, project or settings, in an empty folder.
The service refuses this engine unless the environment is declared synthetic.
"""
import asyncio
import json
import os
import shutil
import subprocess
import tempfile

INSTRUCTION = "Follow the task in the JSON below. Reply with one JSON object only, without commentary or code fences."
TIMEOUT_SECONDS = 170


def model() -> str:
    return os.getenv("AI_CLAUDE_MODEL", "sonnet")


def extract_json_object(text: str) -> str:
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < start:
        raise ValueError("Claude returned no JSON object.")
    return text[start:end + 1]


def run_claude(body: str) -> str:
    executable = shutil.which("claude")
    if executable is None:
        raise ValueError("Claude CLI is not available.")
    command = [
        executable, "-p", "--model", model(), "--tools", "", "--setting-sources", "",
        "--strict-mcp-config", "--no-session-persistence",
    ]
    with tempfile.TemporaryDirectory() as empty_directory:
        try:
            result = subprocess.run(
                command, cwd=empty_directory, input=body.encode("utf-8"), capture_output=True, timeout=TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            raise ValueError("Claude CLI timed out.") from None
    if result.returncode != 0:
        # stdout and stderr may echo the note: neither enters the exception.
        raise ValueError("Claude CLI failed.")
    return result.stdout.decode("utf-8", errors="replace")


async def generate(prompt: dict) -> str:
    body = f"{INSTRUCTION}\n\n{json.dumps(prompt, ensure_ascii=False)}"
    return extract_json_object(await asyncio.to_thread(run_claude, body))
