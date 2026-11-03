from decimal import Decimal
from django.db import transaction
from rest_framework.exceptions import ValidationError
from apps.clinical_notes.models import ClinicalNote
from .models import AIAnalysis, AISource, SentimentMetric, VaultEdge
from services.ai.client import AIClient
from services.security.anonymization import UnsafeClinicalText, prepare_ai_text, residual_identifier_codes


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
            "text": prepare_ai_text(note.raw_text, display_name=patient.display_name, internal_code=patient.internal_code),
        }
        for note in notes
    ]


def request_ai_analysis(*, patient, note, user, context_limit: int, job=None) -> AIAnalysis:
    context = build_context(patient, context_limit)
    if not any(item["text"].strip() for item in context):
        raise ValidationError("At least one anonymized clinical note is required for analysis.")
    payload = {
        "patient_id": str(patient.id),
        "note_id": str(note.id) if note else None,
        "guardrails": SYSTEM_GUARDRAILS,
        "context": context,
        "graph_context": [
            {
                "source": edge.source.label,
                "relation": edge.relation,
                "target": edge.target.label,
                "evidence": edge.evidence,
                "note_id": str(edge.note_id),
                "observed_at": edge.observed_at.isoformat(),
            }
            for edge in VaultEdge.objects.filter(patient=patient, note__deleted_at__isnull=True)
            .select_related("source", "target").order_by("-observed_at", "-id")[:40]
        ],
    }
    if any(residual_identifier_codes(str(edge[field])) for edge in payload["graph_context"] for field in ("source", "target", "evidence")):
        raise UnsafeClinicalText("Historical graph contains an identifier; AI request blocked.")
    data = AIClient().request_analysis(payload)
    with transaction.atomic():
        analysis = AIAnalysis.objects.create(
            patient=patient,
            note=note,
            job=job,
            note_version=note.version if note else None,
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
