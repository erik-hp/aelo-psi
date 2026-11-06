"""Layered context selection on synthetic notes; full text is never degraded."""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.ai_analysis.models import VaultEdge, VaultNode
from apps.ai_analysis.services import build_context
from apps.clinical_notes.models import ClinicalNote
from apps.patients.models import Patient, PatientAccess
from services.security.anonymization import UnsafeClinicalText

pytestmark = pytest.mark.django_db


def add_note(records, text, *, days_ago=0, patient=None):
    note = ClinicalNote.objects.create(patient=patient or records["patient"], author=records["owner"], raw_text=text)
    ClinicalNote.objects.filter(pk=note.pk).update(created_at=timezone.now() - timedelta(days=days_ago))
    note.refresh_from_db()
    return note


def link_concepts(note, source_label, target_label, confidence="0.900"):
    def node(label):
        return VaultNode.objects.create(
            patient=note.patient, fingerprint=f"{note.pk}-{label}"[:64], kind="event", label=label,
            first_seen_at=note.created_at, last_seen_at=note.created_at,
        )
    return VaultEdge.objects.create(
        patient=note.patient, source=node(source_label), target=node(target_label), note=note, relation="associated",
        evidence=f"{source_label} {target_label}", observed_at=note.created_at, confidence=Decimal(confidence),
    )


def history(records, total=25):
    return [add_note(records, f"Sessão sintética de rotina {index}.", days_ago=index + 1) for index in range(total)]


def ids(context):
    return [item["note_id"] for item in context]


@pytest.fixture
def remote(records):
    history(records)
    note = add_note(records, "Relato sintético detalhado sobre luto pelo avô.", days_ago=365)
    link_concepts(note, "luto", "avô")
    return note


def test_recency_window_stays_the_default(records, remote):
    anchor = add_note(records, "Hoje o relato foi sobre luto e insônia.")
    assert str(remote.id) not in ids(build_context(records["patient"], 10, anchor=anchor))


def test_layered_context_brings_remote_note_in_full_text(records, remote, settings):
    settings.AI_LOD_RETRIEVAL = True
    anchor = add_note(records, "Hoje o relato foi sobre luto e insônia.")
    context = build_context(records["patient"], 10, anchor=anchor)
    remote_item = next(item for item in context if item["note_id"] == str(remote.id))
    assert remote_item["text"] == "Relato sintético detalhado sobre luto pelo avô."
    assert remote_item["tier"] == "far"
    assert context[0]["note_id"] == str(anchor.id)


def test_old_anchor_is_always_part_of_the_context(records):
    anchor = add_note(records, "Nota antiga escolhida para análise.", days_ago=400)
    history(records)
    context = build_context(records["patient"], 10, anchor=anchor)
    assert context[0]["note_id"] == str(anchor.id)
    assert len(context) == 10


def test_no_related_concept_keeps_only_recent_notes(records, remote, settings):
    settings.AI_LOD_RETRIEVAL = True
    anchor = add_note(records, "Conversa sintética sobre trabalho.")
    assert str(remote.id) not in ids(build_context(records["patient"], 10, anchor=anchor))


def test_matching_ignores_accents_but_not_word_boundaries(records, settings):
    settings.AI_LOD_RETRIEVAL = True
    history(records)
    accented = add_note(records, "Relato remoto A.", days_ago=300)
    link_concepts(accented, "insônia", "plantão")
    embedded = add_note(records, "Relato remoto B.", days_ago=310)
    link_concepts(embedded, "ira", "discussão")
    anchor = add_note(records, "Queixa de insonia e uma mentira no trabalho.")
    selected = ids(build_context(records["patient"], 10, anchor=anchor))
    assert str(accented.id) in selected
    assert str(embedded.id) not in selected


def test_more_shared_concepts_rank_first_regardless_of_age(records, settings):
    settings.AI_LOD_RETRIEVAL = True
    settings.AI_LOD_MAX_REMOTE_NOTES = 1
    history(records)
    newer = add_note(records, "Relato com um conceito.", days_ago=40)
    link_concepts(newer, "luto", "trabalho", "0.950")
    older = add_note(records, "Relato com dois conceitos.", days_ago=700)
    link_concepts(older, "luto", "insônia", "0.500")
    anchor = add_note(records, "Luto e insônia nesta semana.")
    selected = ids(build_context(records["patient"], 10, anchor=anchor))
    assert str(older.id) in selected
    assert str(newer.id) not in selected


def test_deleted_notes_are_never_recovered(records, remote, settings):
    settings.AI_LOD_RETRIEVAL = True
    remote.soft_delete()
    anchor = add_note(records, "Hoje o relato foi sobre luto.")
    assert str(remote.id) not in ids(build_context(records["patient"], 10, anchor=anchor))


def test_concepts_of_another_patient_never_cross(records, settings):
    settings.AI_LOD_RETRIEVAL = True
    owner = records["owner"]
    other = Patient.objects.create(clinic=owner.clinic, internal_code="P-9", display_name="Outro", created_by=owner)
    PatientAccess.objects.create(patient=other, user=owner, can_edit=True, granted_by=owner)
    foreign = add_note(records, "Relato de outro paciente sobre luto.", days_ago=300, patient=other)
    link_concepts(foreign, "luto", "avô")
    history(records)
    anchor = add_note(records, "Hoje o relato foi sobre luto.")
    assert str(foreign.id) not in ids(build_context(records["patient"], 10, anchor=anchor))


def test_context_never_exceeds_the_service_contract(records, remote, settings):
    settings.AI_LOD_RETRIEVAL = True
    anchor = add_note(records, "Hoje o relato foi sobre luto.")
    context = build_context(records["patient"], 20, anchor=anchor)
    assert len(context) == 20
    assert str(remote.id) in ids(context)


def test_identifier_in_a_remote_note_blocks_the_request(records, remote, settings):
    settings.AI_LOD_RETRIEVAL = True
    ClinicalNote.objects.filter(pk=remote.pk).update(raw_text="Rua das Flores 123 é o endereço.")
    anchor = add_note(records, "Hoje o relato foi sobre luto.")
    with pytest.raises(UnsafeClinicalText):
        build_context(records["patient"], 10, anchor=anchor)
