from decimal import Decimal
from django.db import transaction
from apps.clinical_notes.models import ClinicalNote
from .models import AIAnalysis, AISource, SentimentMetric
from services.ai.client import AIClient


SYSTEM_GUARDRAILS = [
    "Do not diagnose.",
    "Do not replace clinical judgment.",
    "Do not modify records.",
    "Return assistive observations only for human review.",
]


def build_context(patient, limit: int) -> list[dict]:
    notes = ClinicalNote.objects.filter(patient=patient, deleted_at__isnull=True).order_by("-created_at")[:limit]
    return [
        {
            "note_id": str(note.id),
            "session_id": str(note.session_id) if note.session_id else None,
            "created_at": note.created_at.isoformat(),
            "text": note.anonymized_text,
        }
        for note in notes
    ]


@transaction.atomic
def request_ai_analysis(*, patient, note, user, context_limit: int) -> AIAnalysis:
    context = build_context(patient, context_limit)
    payload = {
        "patient_id": str(patient.id),
        "note_id": str(note.id) if note else None,
        "guardrails": SYSTEM_GUARDRAILS,
        "context": context,
    }
    data = AIClient().request_analysis(payload)
    analysis = AIAnalysis.objects.create(
        patient=patient,
        note=note,
        requested_by=user,
        patterns=data.get("patterns", []),
        longitudinal_evolution=data.get("longitudinal_evolution", ""),
        attention_points=data.get("attention_points", []),
        narrative_metrics=data.get("narrative_metrics", {}),
        behavioral_changes=data.get("behavioral_changes", []),
        longitudinal_coherence=data.get("longitudinal_coherence", ""),
        possible_inconsistencies=data.get("possible_inconsistencies", []),
        relevance_score=Decimal(str(data.get("relevance_score", 0))),
        raw_response=data,
    )
    for source in data.get("sources", []):
        AISource.objects.create(
            analysis=analysis,
            note_id=source.get("note_id") or None,
            session_id=source.get("session_id") or None,
            excerpt=source.get("excerpt", ""),
            relevance_score=Decimal(str(source.get("relevance_score", 0))),
        )
    for metric in data.get("sentiment_metrics", []):
        SentimentMetric.objects.create(
            analysis=analysis,
            label=metric.get("label", "unknown"),
            value=Decimal(str(metric.get("value", 0))),
            metadata=metric.get("metadata", {}),
        )
    return analysis
