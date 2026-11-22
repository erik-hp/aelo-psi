"""Validated request and response contracts for the assistive AI service."""

from typing import Literal

from pydantic import BaseModel, Field


class ContextItem(BaseModel):
    note_id: str
    session_id: str | None = None
    created_at: str
    text: str = Field(max_length=10_000)
    tier: Literal["near", "far"] = "near"


class GraphFact(BaseModel):
    source: str = Field(max_length=120)
    relation: str = Field(max_length=32)
    target: str = Field(max_length=120)
    evidence: str = Field(max_length=240)
    note_id: str
    observed_at: str


class AnalysisRequest(BaseModel):
    patient_id: str
    note_id: str | None = None
    guardrails: list[str] = Field(default_factory=list, max_length=10)
    context: list[ContextItem] = Field(min_length=1, max_length=20)
    graph_context: list[GraphFact] = Field(default_factory=list, max_length=40)


class SourceItem(BaseModel):
    note_id: str
    excerpt: str = Field(max_length=240)
    relevance_score: float = Field(default=0, ge=0, le=1)


class SentimentItem(BaseModel):
    label: str
    value: float
    metadata: dict = Field(default_factory=dict)


class AnalysisResult(BaseModel):
    patterns: list[str] = Field(default_factory=list)
    longitudinal_evolution: str = ""
    attention_points: list[str] = Field(default_factory=list)
    narrative_metrics: dict = Field(default_factory=dict)
    behavioral_changes: list[str] = Field(default_factory=list)
    longitudinal_coherence: str = ""
    possible_inconsistencies: list[str] = Field(default_factory=list)
    sources: list[SourceItem] = Field(default_factory=list)
    sentiment_metrics: list[SentimentItem] = Field(default_factory=list)
    relevance_score: float = Field(default=0, ge=0, le=1)


class VaultNodeItem(BaseModel):
    kind: str = Field(max_length=32)
    label: str = Field(max_length=120)
    evidence: str = Field(max_length=240)


class VaultEdgeItem(BaseModel):
    source: int
    target: int
    relation: str = Field(max_length=32)
    evidence: str = Field(max_length=240)
    confidence: float = Field(default=0, ge=0, le=1)  # 0 = model gave none


class VaultExtraction(BaseModel):
    # Long notes are read in chunks and merged, so the cap is per note, not per model call.
    nodes: list[VaultNodeItem] = Field(default_factory=list, max_length=400)
    edges: list[VaultEdgeItem] = Field(default_factory=list, max_length=600)


class VaultRequest(BaseModel):
    note: ContextItem


class VaultEvidence(BaseModel):
    note_id: str
    excerpt: str = Field(max_length=240)


class VaultSynthesisRequest(BaseModel):
    current: list[VaultEvidence] = Field(default_factory=list, max_length=30)
    history: list[VaultEvidence] = Field(default_factory=list, max_length=30)


class VaultClaim(BaseModel):
    text: str = Field(max_length=300)
    note_id: str
    excerpt: str = Field(max_length=240)
    kind: str


class VaultSynthesis(BaseModel):
    claims: list[VaultClaim] = Field(default_factory=list, max_length=12)
