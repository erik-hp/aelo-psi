"""Layered note selection over a patient's whole timeline (ADR-003).

The derived Vault graph is the distant, cheap view. Remote notes reach the model
only as unaltered full text, and age never lowers their rank: a graph or index
can be rebuilt, but it never replaces the clinical record.
"""
import re
import unicodedata
from collections import defaultdict
from decimal import Decimal

from django.db.models import Q

from apps.clinical_notes.models import ClinicalNote

from .models import VaultEdge, VaultNode

MAX_GRAPH_LABELS = 1000
MIN_LABEL_LENGTH = 3


def normalized(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text or "")
    return "".join(char for char in decomposed if not unicodedata.combining(char)).casefold()


def contains_label(normalized_text: str, label: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(label)}(?!\w)", normalized_text) is not None


def concepts_in_text(patient, text: str) -> set:
    """Return ids of this patient's graph concepts literally present in the text."""
    haystack = normalized(text)
    nodes = VaultNode.objects.filter(patient=patient).order_by("-mention_count", "id")[:MAX_GRAPH_LABELS]
    matched = set()
    for node in nodes:
        label = normalized(node.label).strip()
        if len(label) >= MIN_LABEL_LENGTH and contains_label(haystack, label):
            matched.add(node.id)
    return matched


def related_remote_notes(patient, text: str, *, exclude, limit: int) -> list:
    """Rank older notes by shared concepts, then evidence confidence, never by age."""
    if limit <= 0:
        return []
    concepts = concepts_in_text(patient, text)
    if not concepts:
        return []
    edges = (
        VaultEdge.objects.filter(patient=patient, note__patient=patient, note__deleted_at__isnull=True)
        .filter(Q(source_id__in=concepts) | Q(target_id__in=concepts))
        .exclude(note_id__in=exclude)
        .values_list("note_id", "source_id", "target_id", "confidence")
    )
    shared, confidence = defaultdict(set), defaultdict(Decimal)
    for note_id, source_id, target_id, edge_confidence in edges:
        shared[note_id].update({source_id, target_id} & concepts)
        confidence[note_id] += edge_confidence
    ranked = sorted(shared, key=lambda note_id: (-len(shared[note_id]), -confidence[note_id], str(note_id)))[:limit]
    notes = ClinicalNote.objects.filter(patient=patient, deleted_at__isnull=True, pk__in=ranked).in_bulk()
    return [notes[note_id] for note_id in ranked if note_id in notes]
