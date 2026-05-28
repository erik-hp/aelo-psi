import os
import httpx
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="AELO Assistive AI Service", version="0.1.0")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")


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


def fallback_analysis(payload: AnalysisRequest) -> dict:
    sources = [
        {
            "note_id": item.note_id,
            "session_id": item.session_id,
            "excerpt": item.text[:240],
            "relevance_score": 0.75,
        }
        for item in payload.context[:5]
    ]
    word_count = sum(len(item.text.split()) for item in payload.context)
    return {
        "patterns": ["Context reviewed for recurring narrative elements."],
        "longitudinal_evolution": "Assistive summary pending richer model output.",
        "attention_points": ["Review abrupt narrative changes and missing follow-up themes."],
        "narrative_metrics": {"context_items": len(payload.context), "word_count": word_count},
        "behavioral_changes": [],
        "longitudinal_coherence": "No autonomous clinical conclusion generated.",
        "possible_inconsistencies": [],
        "sources": sources,
        "sentiment_metrics": [],
        "relevance_score": 0.7 if sources else 0,
    }


async def ollama_analysis(payload: AnalysisRequest) -> dict:
    prompt = {
        "role": "assistive_analysis",
        "rules": payload.guardrails,
        "expected_json_keys": [
            "patterns",
            "longitudinal_evolution",
            "attention_points",
            "narrative_metrics",
            "behavioral_changes",
            "longitudinal_coherence",
            "possible_inconsistencies",
            "sources",
            "sentiment_metrics",
            "relevance_score",
        ],
        "context": [item.model_dump() for item in payload.context],
    }
    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL.rstrip('/')}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": str(prompt), "stream": False, "format": "json"},
        )
        response.raise_for_status()
        data = response.json()
    try:
        import json

        return json.loads(data.get("response", "{}"))
    except Exception:
        return fallback_analysis(payload)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analysis")
async def analysis(payload: AnalysisRequest) -> dict:
    try:
        result = await ollama_analysis(payload)
    except Exception:
        result = fallback_analysis(payload)
    result.setdefault("sources", fallback_analysis(payload)["sources"])
    result.setdefault("relevance_score", 0)
    return result
