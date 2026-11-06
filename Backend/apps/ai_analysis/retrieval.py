"""Layered note selection over a patient's whole timeline (ADR-003).

Two routes find older notes: the structure extracted when a note was read in full
(the Vault graph) and the source text itself, so whatever extraction missed can
still be found. Remote notes reach the model only as unaltered full text, and age
never lowers their rank. Nothing here is persisted: source text is scored in memory
after authorization, so no derived index of clinical content is created.
"""
import math
import re
import unicodedata
from collections import Counter, defaultdict
from decimal import Decimal

from django.conf import settings
from django.db.models import Q

from apps.clinical_notes.models import ClinicalNote

from .models import VaultEdge, VaultNode

MAX_GRAPH_LABELS = 1000
MIN_LABEL_LENGTH = 3
MIN_TERM_LENGTH = 3  # Words such as "pai", "mãe" and "avô" carry clinical meaning.
MAX_TERM_DOCUMENT_SHARE = 0.25  # Words in over a quarter of the history do not discriminate notes.
BM25_K1 = 1.2
BM25_B = 0.75
STOPWORDS = frozenset(
    """
    aos com das dos ela ele era mas nao nas nos por que sem sim sua seu tem uma uns
    aquela aquele aquilo assim como contra desde dessa desse esta este estao estava foram isso
    mais mesmo muito nesta neste nessa nesse para pela pelas pelo pelos porque quando quem seja
    sobre suas seus teve toda todo todos voltou ainda apenas depois entre foi hoje semana sessao
    """.split()
)


def normalized(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text or "")
    return "".join(char for char in decomposed if not unicodedata.combining(char)).casefold()


def contains_label(normalized_text: str, label: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(label)}(?!\w)", normalized_text) is not None


def terms(text: str) -> list[str]:
    return [word for word in re.findall(r"[^\W\d_]+", normalized(text)) if len(word) >= MIN_TERM_LENGTH and word not in STOPWORDS]


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


def graph_ranking(patient, text: str, *, exclude) -> list:
    """Rank older notes by shared concepts, then evidence confidence, never by age."""
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
    return sorted(shared, key=lambda note_id: (-len(shared[note_id]), -confidence[note_id], str(note_id)))


def source_text_ranking(patient, text: str, *, exclude) -> list:
    """Score the patient's own notes with BM25 restricted to discriminating terms."""
    documents = {
        note.pk: Counter(terms(note.raw_text))
        for note in ClinicalNote.objects.filter(patient=patient, deleted_at__isnull=True).iterator()
    }
    if not documents:
        return []
    total = len(documents)
    frequency = Counter(term for document in documents.values() for term in document)
    query = {term for term in terms(text) if 0 < frequency[term] <= max(1, total * MAX_TERM_DOCUMENT_SHARE)}
    average_length = sum(sum(document.values()) for document in documents.values()) / total or 1
    excluded = set(exclude)
    scores = {}
    for note_id, document in documents.items():
        shared = query & document.keys()
        if note_id in excluded or not shared:
            continue
        length = sum(document.values())
        scores[note_id] = sum(
            math.log(1 + (total - frequency[term] + 0.5) / (frequency[term] + 0.5))
            * document[term] * (BM25_K1 + 1)
            / (document[term] + BM25_K1 * (1 - BM25_B + BM25_B * length / average_length))
            for term in shared
        )
    return sorted(scores, key=lambda note_id: (-scores[note_id], str(note_id)))


def interleave(rankings: list[list], limit: int) -> list:
    """Alternate routes instead of summing them: notes found by both must not crowd out the rest."""
    selected = []
    for position in range(max(map(len, rankings), default=0)):
        for ranking in rankings:
            if position < len(ranking) and ranking[position] not in selected:
                selected.append(ranking[position])
    return selected[:limit]


def related_remote_notes(patient, text: str, *, exclude, limit: int) -> list:
    """Give each route its own slots, so being found by either one is enough."""
    rankings = [graph_ranking(patient, text, exclude=exclude)]
    if settings.AI_LOD_SOURCE_SEARCH:
        rankings.append(source_text_ranking(patient, text, exclude=exclude))
    selected = interleave(rankings, limit)
    notes = ClinicalNote.objects.filter(patient=patient, deleted_at__isnull=True, pk__in=selected).in_bulk()
    return [notes[note_id] for note_id in selected if note_id in notes]
