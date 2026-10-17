"""Assistive local inference. Never fabricate clinical results on outages."""
import json
import os
import secrets

import httpx
from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, Field, ValidationError

app = FastAPI(title="AELO Assistive AI Service", version="0.2.0")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")


def require_service_token(x_aelo_service_token: str | None = Header(default=None)) -> None:
    configured = os.getenv("AI_SERVICE_TOKEN", "")
    if not configured or configured.startswith("CHANGE_ME") or not x_aelo_service_token or not secrets.compare_digest(x_aelo_service_token, configured):
        raise HTTPException(status_code=403, detail="Service authentication required.")


class ContextItem(BaseModel):
    note_id: str
    session_id: str | None = None
    created_at: str
    text: str


class AnalysisRequest(BaseModel):
    patient_id: str
    note_id: str | None = None
    guardrails: list[str] = Field(default_factory=list)
    context: list[ContextItem] = Field(default_factory=list)


class AnalysisSource(BaseModel):
    note_id: str
    session_id: str | None = None
    excerpt: str = ""
    relevance_score: float = Field(ge=0, le=1, default=0)


class AnalysisResult(BaseModel):
    patterns: list[str]
    longitudinal_evolution: str
    attention_points: list[str]
    narrative_metrics: dict = Field(default_factory=dict)
    behavioral_changes: list[str] = Field(default_factory=list)
    longitudinal_coherence: str = ""
    possible_inconsistencies: list[str] = Field(default_factory=list)
    sources: list[AnalysisSource]
    sentiment_metrics: list[dict] = Field(default_factory=list)
    relevance_score: float = Field(ge=0, le=1)


async def ollama_analysis(payload: AnalysisRequest) -> AnalysisResult:
    prompt = {
        "role": "assistive_analysis",
        "rules": payload.guardrails + [
            "Use only supplied notes. Never diagnose or predict clinical risk.",
            "Return JSON, and abstain when sources are insufficient.",
        ],
        "expected_json_keys": list(AnalysisResult.model_fields),
        "context": [item.model_dump() for item in payload.context],
    }
    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL.rstrip('/')}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": json.dumps(prompt, ensure_ascii=False), "stream": False, "format": "json"},
        )
        response.raise_for_status()
        raw = response.json()
    output = AnalysisResult.model_validate_json(raw.get("response", "{}"))
    note_ids = {item.note_id for item in payload.context}
    for source in output.sources:
        if source.note_id not in note_ids:
            raise ValueError("AI cited a note outside the supplied patient context.")
    # Scores remain model-generated claims, not evaluated clinical measurements.
    return output


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analysis", response_model=AnalysisResult, dependencies=[Depends(require_service_token)])
async def analysis(payload: AnalysisRequest) -> AnalysisResult:
    if not payload.context:
        raise HTTPException(status_code=422, detail="No authorized clinical context provided.")
    try:
        return await ollama_analysis(payload)
    except (httpx.HTTPError, ValueError, ValidationError, KeyError) as exc:
        # Do not leak any prompt, response or clinical text in an exception body.
        raise HTTPException(status_code=503, detail="AI analysis unavailable or unverified.") from None
