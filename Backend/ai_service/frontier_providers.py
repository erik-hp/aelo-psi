"""HTTP adapters for Gemini and Anthropic Claude (synthetic data only — ADR-004 / SC-IA-01).

Security invariants:
- External providers are strictly gated by AELO_SYNTHETIC_DATA_ONLY=True in main.py.
- API keys are transmitted exclusively in request headers (never in URLs or query strings).
- Prompt text, model outputs, and credentials are never echoed in raised exceptions or logs.
"""
import json
import math
import os
import re
from urllib.parse import urlsplit

import httpx

from .claude_cli import INSTRUCTION, extract_json_object

_SAFE_MODEL_RE = re.compile(r"^[A-Za-z0-9._-]+$")
_PLACEHOLDER_PREFIXES = ("CHANGE_ME", "replace-with", "change-me", "your-")


def _clean_secret(env_name: str) -> str:
    value = os.getenv(env_name, "").strip()
    if not value or value.startswith(_PLACEHOLDER_PREFIXES):
        raise ValueError(f"{env_name} is not configured.")
    return value


def _clean_model(env_name: str, default: str) -> str:
    model = os.getenv(env_name, default).strip()
    if not model or len(model) > 120 or not _SAFE_MODEL_RE.fullmatch(model):
        raise ValueError(f"Invalid model identifier in {env_name}.")
    return model


def _clean_base_url(env_name: str, default: str) -> str:
    raw = os.getenv(env_name, default).strip().rstrip("/")
    parsed = urlsplit(raw)
    if parsed.scheme not in {"https", "http"} or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError(f"Invalid base URL in {env_name}.")
    if parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1"}:
        raise ValueError(f"{env_name} requires HTTPS outside loopback test endpoints.")
    return raw


def _max_output_tokens() -> int:
    return max(512, min(8192, int(os.getenv("AI_MAX_OUTPUT_TOKENS", "2048"))))


def gemini_model() -> str:
    return _clean_model("GEMINI_MODEL", "gemini-2.5-pro")


def gemini_embed_model() -> str:
    return _clean_model("GEMINI_EMBED_MODEL", "gemini-embedding-001")


def gemini_embeddings_enabled() -> bool:
    return os.getenv("GEMINI_USE_EMBEDDINGS", "False").lower() == "true"


def anthropic_model() -> str:
    return _clean_model("ANTHROPIC_MODEL", "claude-sonnet-4-5")


def check_ready(engine: str) -> list[str]:
    if engine == "gemini":
        _clean_secret("GEMINI_API_KEY")
        _clean_base_url("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
        models = [gemini_model()]
        if gemini_embeddings_enabled():
            models.append(gemini_embed_model())
        return models
    if engine == "anthropic":
        _clean_secret("ANTHROPIC_API_KEY")
        _clean_base_url("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1")
        return [anthropic_model()]
    raise ValueError("Unsupported external engine.")


async def _post_json(client: httpx.AsyncClient | None, url: str, headers: dict[str, str], payload: dict) -> dict:
    try:
        if client is None:
            async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=5.0)) as temp_client:
                response = await temp_client.post(url, headers=headers, json=payload)
        else:
            response = await client.post(url, headers=headers, json=payload)
        if response.status_code >= 400:
            raise ValueError(f"Upstream provider rejected request with HTTP {response.status_code}.")
        data = response.json()
    except (httpx.HTTPError, json.JSONDecodeError, ValueError) as exc:
        if isinstance(exc, ValueError) and str(exc).startswith("Upstream provider"):
            raise
        raise ValueError("External AI provider request failed.") from None
    if not isinstance(data, dict):
        raise ValueError("External AI provider returned a non-object payload.")
    return data


async def generate_gemini(prompt: dict, client: httpx.AsyncClient | None = None) -> str:
    api_key = _clean_secret("GEMINI_API_KEY")
    model = gemini_model()
    base_url = _clean_base_url("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    body = f"{INSTRUCTION}\n\n{json.dumps(prompt, ensure_ascii=False)}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": body}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": _max_output_tokens(),
            "responseMimeType": "application/json",
        },
    }
    data = await _post_json(
        client,
        f"{base_url}/models/{model}:generateContent",
        {"x-goog-api-key": api_key, "content-type": "application/json"},
        payload,
    )
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise ValueError("Gemini returned no candidates.")
    parts = candidates[0].get("content", {}).get("parts") if isinstance(candidates[0], dict) else None
    if not isinstance(parts, list) or not parts or not isinstance(parts[0], dict):
        raise ValueError("Gemini returned no text content.")
    text = parts[0].get("text")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Gemini returned an empty response.")
    return extract_json_object(text)


async def embed_gemini(texts: list[str], client: httpx.AsyncClient | None = None) -> list[list[float]]:
    if not texts:
        return []
    api_key = _clean_secret("GEMINI_API_KEY")
    model = gemini_embed_model()
    base_url = _clean_base_url("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    requests_batch = [
        {
            "model": f"models/{model}",
            "content": {"parts": [{"text": item}]},
            "outputDimensionality": 768,
        }
        for item in texts
    ]
    data = await _post_json(
        client,
        f"{base_url}/models/{model}:batchEmbedContents",
        {"x-goog-api-key": api_key, "content-type": "application/json"},
        {"requests": requests_batch},
    )
    raw_embeddings = data.get("embeddings")
    if not isinstance(raw_embeddings, list) or len(raw_embeddings) != len(texts):
        raise ValueError("Gemini returned an invalid embedding batch.")
    vectors: list[list[float]] = []
    expected_dim: int | None = None
    for entry in raw_embeddings:
        values = entry.get("values") if isinstance(entry, dict) else None
        if not isinstance(values, list) or not values or len(values) > 4096:
            raise ValueError("Gemini returned invalid embedding vectors.")
        if expected_dim is None:
            expected_dim = len(values)
        if len(values) != expected_dim or not all(isinstance(n, (int, float)) and math.isfinite(n) for n in values):
            raise ValueError("Gemini returned non-finite or mismatched embedding vectors.")
        vectors.append([float(n) for n in values])
    return vectors


async def generate_anthropic(prompt: dict, client: httpx.AsyncClient | None = None) -> str:
    api_key = _clean_secret("ANTHROPIC_API_KEY")
    model = anthropic_model()
    base_url = _clean_base_url("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1")
    payload = {
        "model": model,
        "max_tokens": _max_output_tokens(),
        "temperature": 0.1,
        "system": INSTRUCTION,
        "messages": [{"role": "user", "content": json.dumps(prompt, ensure_ascii=False)}],
    }
    data = await _post_json(
        client,
        f"{base_url}/messages",
        {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        payload,
    )
    blocks = data.get("content")
    if not isinstance(blocks, list) or not blocks:
        raise ValueError("Anthropic returned no content blocks.")
    text_parts = [block.get("text", "") for block in blocks if isinstance(block, dict) and block.get("type") == "text"]
    joined = "\n".join(part for part in text_parts if isinstance(part, str) and part.strip())
    if not joined:
        raise ValueError("Anthropic returned no text block.")
    return extract_json_object(joined)
