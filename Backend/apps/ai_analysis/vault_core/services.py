"""Patient-scoped, evidence-bound graph and deterministic Markdown checkpoints."""

import hashlib
import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from services.ai.client import AIClient
from services.security.anonymization import UnsafeClinicalText, prepare_ai_text, residual_identifier_codes

from ..models import AnalysisStatus, NoteExtractionJob, VaultCheckpoint, VaultEdge, VaultJob, VaultNode
from .algorithms import detect_communities, fingerprint as node_fingerprint, weighted_centrality
from .constants import KINDS, RELATIONS
from .renderers import render_checkpoint_markdown


class SupersededNote(Exception):
    """The note changed or was deleted while it was being read."""


def extract_note_graph(note):
    """Read one full note through the local model and validate literal evidence."""
    patient = note.patient
    text = prepare_ai_text(note.raw_text, patient.display_name, patient.internal_code)
    if not text.strip():
        raise ValidationError("The anonymized source note is empty.")
    payload = {"note": {"note_id": str(note.pk), "session_id": str(note.session_id) if note.session_id else None, "created_at": note.created_at.isoformat(), "text": text}}
    data = AIClient().request_vault(payload)
    raw_nodes, raw_edges = data.get("nodes"), data.get("edges")
    if not isinstance(raw_nodes, list) or not isinstance(raw_edges, list) or len(raw_nodes) > 400 or len(raw_edges) > 600:
        raise ValidationError("Invalid graph extraction.")
    for item in raw_nodes:
        if not isinstance(item, dict) or item.get("kind") not in KINDS or not isinstance(item.get("label"), str) or not isinstance(item.get("evidence"), str) or not item["label"] or not item["evidence"] or len(item["label"]) > 120 or len(item["evidence"]) > 240 or item["label"] not in text or item["evidence"] not in text:
            raise ValidationError("Graph node lacks literal source evidence.")
        vector = item.get("embedding")
        if vector is not None and (not isinstance(vector, list) or not vector or len(vector) > 4096 or any(not isinstance(value, (int, float)) or not -1e6 < value < 1e6 for value in vector)):
            raise ValidationError("Invalid node embedding.")
    for item in raw_edges:
        if not isinstance(item, dict) or item.get("relation") not in RELATIONS or not isinstance(item.get("source"), int) or not isinstance(item.get("target"), int) or item["source"] < 0 or item["target"] < 0 or item["source"] >= len(raw_nodes) or item["target"] >= len(raw_nodes) or item["source"] == item["target"] or not isinstance(item.get("evidence"), str) or not item["evidence"] or len(item["evidence"]) > 240 or item["evidence"] not in text:
            raise ValidationError("Graph edge lacks literal source evidence.")
        try:
            confidence = Decimal(str(item.get("confidence", 0)))
        except (ValueError, TypeError):
            raise ValidationError("Invalid edge confidence.") from None
        if not 0 <= confidence <= 1:
            raise ValidationError("Invalid edge confidence.")
    return raw_nodes, raw_edges


def persist_note_graph(note, raw_nodes, raw_edges):
    """Replace this note's derived graph; call inside a transaction holding the note lock.

    Reading a note again never duplicates it, and an edited note stops contributing
    what came from its previous text. Mentions count once per note.
    """
    patient = note.patient
    previous = list(VaultEdge.objects.filter(note=note).values_list("source_id", "target_id"))
    first_reading = not previous and not NoteExtractionJob.objects.filter(note=note, status=VaultJob.Status.COMPLETED).exists()
    VaultEdge.objects.filter(note=note).delete()
    nodes = []
    seen_fingerprints = set()
    seen_at = note.created_at
    for item in raw_nodes:
        fingerprint = node_fingerprint(patient.pk, item["kind"], item["label"])
        node, created = VaultNode.objects.get_or_create(
            patient=patient, fingerprint=fingerprint,
            defaults={"kind": item["kind"], "label": item["label"], "embedding": item.get("embedding"), "first_seen_at": seen_at, "last_seen_at": seen_at, "mention_count": 1, "weight": Decimal("1.000")},
        )
        if not created and first_reading and fingerprint not in seen_fingerprints:
            fields = []
            elapsed_days = max((seen_at - node.last_seen_at).days, 0)
            node.weight = min(Decimal("99999.999"), node.weight * (Decimal("0.98") ** elapsed_days) + Decimal("1.000"))
            node.mention_count += 1
            fields.extend(["weight", "mention_count"])
            if seen_at > node.last_seen_at:
                node.last_seen_at = seen_at
                fields.append("last_seen_at")
            if seen_at < node.first_seen_at:
                node.first_seen_at = seen_at
                fields.append("first_seen_at")
            if fields:
                node.save(update_fields=[*fields, "updated_at"])
        seen_fingerprints.add(fingerprint)
        nodes.append(node)
    seen_edges = set()
    for item in raw_edges:
        edge_key = (nodes[item["source"]].pk, nodes[item["target"]].pk, item["relation"], item["evidence"])
        if edge_key in seen_edges:
            continue
        seen_edges.add(edge_key)
        VaultEdge.objects.create(
            patient=patient, source=nodes[item["source"]], target=nodes[item["target"]],
            note=note, relation=item["relation"], evidence=item["evidence"],
            observed_at=seen_at, confidence=Decimal(str(item.get("confidence", 0))), weight=Decimal(str(item.get("confidence", 0))),
        )
    stale = {node_id for pair in previous for node_id in pair} - {node.pk for node in nodes}
    VaultNode.objects.filter(pk__in=stale, mention_count__lte=1, outgoing_edges__isnull=True, incoming_edges__isnull=True).delete()
    return nodes


def refresh_note_graph(note, version):
    """Read a note outside any transaction, then store the result only if it still applies."""
    raw_nodes, raw_edges = extract_note_graph(note)
    with transaction.atomic():
        locked_note = type(note).objects.select_related("patient").select_for_update(of=("self",)).get(pk=note.pk)
        if locked_note.deleted_at is not None or locked_note.version != version or locked_note.raw_text != note.raw_text:
            raise SupersededNote()
        persist_note_graph(locked_note, raw_nodes, raw_edges)


def create_checkpoint(analysis):
    if analysis.status != AnalysisStatus.PENDING_REVIEW:
        raise ValidationError("A checkpoint must be created before the signed clinical review.")
    if analysis.note is None or analysis.note.deleted_at is not None:
        raise ValidationError("A non-deleted source note is required for a vault checkpoint.")
    if analysis.note_version is None or analysis.note_version != analysis.note.version:
        raise ValidationError("The source note version no longer matches the analysis.")
    if VaultCheckpoint.objects.filter(analysis=analysis).exists():
        raise ValidationError("A checkpoint already exists for this analysis.")
    note = analysis.note
    source_version = note.version
    patient = analysis.patient
    raw_nodes, raw_edges = extract_note_graph(note)

    current_evidence = [{"note_id": str(note.pk), "excerpt": item["evidence"]} for item in raw_nodes]
    historical_edges = list(VaultEdge.objects.filter(patient=patient, observed_at__lt=note.created_at).order_by("-observed_at", "-id")[:30])
    history_evidence = [{"note_id": str(edge.note_id), "excerpt": edge.evidence} for edge in historical_edges]
    if any(residual_identifier_codes(item["excerpt"]) for item in history_evidence):
        raise UnsafeClinicalText("Historical graph contains an identifier; AI request blocked.")
    synthesis = AIClient().request_vault_synthesis({"current": current_evidence, "history": history_evidence}) if current_evidence else {"claims": []}
    claims = synthesis.get("claims") if isinstance(synthesis, dict) else None
    if not isinstance(claims, list) or len(claims) > 12:
        raise ValidationError("Invalid vault synthesis.")
    allowed_evidence = {(item["note_id"], item["excerpt"]) for item in current_evidence + history_evidence}
    for claim in claims:
        if not isinstance(claim, dict) or claim.get("kind") not in {"local", "global", "question"} or not isinstance(claim.get("text"), str) or not claim["text"].strip() or len(claim["text"]) > 300 or (claim.get("note_id"), claim.get("excerpt")) not in allowed_evidence:
            raise ValidationError("Vault synthesis lacks literal source evidence.")
        if claim["kind"] == "local" and (claim["note_id"], claim["excerpt"]) not in {(item["note_id"], item["excerpt"]) for item in current_evidence}:
            raise ValidationError("A local claim must cite the current note.")

    with transaction.atomic():
        if VaultCheckpoint.objects.select_for_update().filter(analysis=analysis).exists():
            raise ValidationError("A checkpoint already exists for this analysis.")
        locked_note = type(note).objects.select_for_update().get(pk=note.pk)
        if VaultCheckpoint.objects.filter(analysis__note=locked_note).exists():
            raise ValidationError("This source note already has a vault checkpoint.")
        if locked_note.deleted_at is not None or locked_note.version != source_version or locked_note.raw_text != note.raw_text:
            raise ValidationError("The source note changed during graph extraction; retry with a new analysis.")
        if locked_note.locked_at is None:
            locked_note.locked_at = timezone.now()
            locked_note.save(update_fields=["locked_at", "updated_at"])
        persist_note_graph(note, raw_nodes, raw_edges)
        seen_at = note.created_at
        all_nodes = list(VaultNode.objects.filter(patient=patient).order_by("first_seen_at", "id")[:1000])
        node_ids = {node.id for node in all_nodes}
        all_edges = list(VaultEdge.objects.filter(patient=patient, source_id__in=node_ids, target_id__in=node_ids).select_related("note", "source", "target").order_by("observed_at", "id")[:2000])
        communities = detect_communities(all_nodes, all_edges)
        centrality = weighted_centrality(all_nodes, all_edges, seen_at)
        ranked_nodes = sorted(all_nodes, key=lambda node: (centrality[node.id], node.mention_count), reverse=True)[:5]
        checkpoint_id = uuid.uuid4()
        markdown = render_checkpoint_markdown(
            checkpoint_id=checkpoint_id, patient=patient, analysis=analysis, note=note,
            raw_nodes=raw_nodes, raw_edges=raw_edges, claims=claims,
            all_nodes=all_nodes, all_edges=all_edges, communities=communities,
            centrality=centrality, ranked_nodes=ranked_nodes,
        )
        return VaultCheckpoint.objects.create(
            id=checkpoint_id, patient=patient, analysis=analysis, markdown=markdown,
            content_sha256=hashlib.sha256(markdown.encode("utf-8")).hexdigest(),
            node_count=len(all_nodes), edge_count=len(all_edges),
        )
