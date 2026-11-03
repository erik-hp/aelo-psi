import hashlib

import pytest
from rest_framework.test import APIClient

from apps.ai_analysis.models import AIAnalysis, VaultCheckpoint, VaultEdge, VaultNode
from apps.ai_analysis.signatures import signing_payload
from apps.ai_analysis.vault import create_checkpoint
from services.ai.client import AIClient


@pytest.mark.django_db
def test_vault_checkpoint_is_evidence_bound_and_patient_scoped(records, monkeypatch):
    patient, note, owner, outsider = (records[key] for key in ("patient", "note", "owner", "outsider"))
    note.raw_text = "Relata insônia após mudança de turno."
    note.save(update_fields=["raw_text"])
    analysis = AIAnalysis.objects.create(patient=patient, note=note, note_version=note.version, requested_by=owner)
    monkeypatch.setattr(AIClient, "request_vault", lambda self, payload: {
        "nodes": [
            {"kind": "symptom", "label": "insônia", "evidence": "Relata insônia", "embedding": [0.1, 0.2]},
            {"kind": "context", "label": "mudança de turno", "evidence": "mudança de turno", "embedding": [0.2, 0.1]},
        ],
        "edges": [{"source": 0, "target": 1, "relation": "associated", "evidence": "insônia após mudança de turno", "confidence": 0.7}],
    })
    monkeypatch.setattr(AIClient, "request_vault_synthesis", lambda self, payload: {"claims": [{"kind": "local", "text": "A nota menciona insônia.", "note_id": str(note.pk), "excerpt": "Relata insônia"}]})
    checkpoint = create_checkpoint(analysis)
    note.refresh_from_db()
    assert note.locked_at is not None
    assert VaultNode.objects.filter(patient=patient).count() == 2
    assert VaultNode.objects.get(patient=patient, kind="symptom").mention_count == 1
    assert VaultEdge.objects.get(patient=patient).weight == VaultEdge.objects.get(patient=patient).confidence
    assert "A nota menciona insônia." in checkpoint.markdown
    assert VaultEdge.objects.filter(patient=patient, note=note).count() == 1
    assert checkpoint.content_sha256 == hashlib.sha256(checkpoint.markdown.encode()).hexdigest()
    assert checkpoint.content_sha256 in signing_payload(analysis, decision="VALIDATED", comment="ok", reviewer_id=owner.pk).decode()

    client = APIClient()
    client.force_authenticate(user=outsider)
    assert client.get(f"/api/vault/patients/{patient.pk}/").status_code == 404
    assert client.get(f"/api/vault/checkpoints/{checkpoint.pk}/").status_code == 404
    client.force_authenticate(user=owner)
    assert client.get(f"/api/vault/checkpoints/{checkpoint.pk}/?download=1").status_code == 403
    assert client.get(f"/api/vault/checkpoints/{checkpoint.pk}/").status_code == 200


@pytest.mark.django_db
def test_vault_rejects_unsupported_evidence(records, monkeypatch):
    patient, note, owner = (records[key] for key in ("patient", "note", "owner"))
    analysis = AIAnalysis.objects.create(patient=patient, note=note, note_version=note.version, requested_by=owner)
    monkeypatch.setattr(AIClient, "request_vault", lambda self, payload: {
        "nodes": [{"kind": "symptom", "label": "hallucination", "evidence": "not in note"}], "edges": [],
    })
    with pytest.raises(Exception, match="literal source evidence"):
        create_checkpoint(analysis)
    assert not VaultCheckpoint.objects.exists()


@pytest.mark.django_db
def test_vault_rejects_stale_note_version(records):
    patient, note, owner = (records[key] for key in ("patient", "note", "owner"))
    analysis = AIAnalysis.objects.create(patient=patient, note=note, note_version=note.version, requested_by=owner)
    note.version += 1
    note.save(update_fields=["version"])
    with pytest.raises(Exception, match="version no longer matches"):
        create_checkpoint(analysis)
