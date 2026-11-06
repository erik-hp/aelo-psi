"""Synthetic evaluation of layered retrieval through the real selection code.

Run explicitly: python -m pytest tests/evaluate_lod_retrieval.py -s -q

Extraction quality and vocabulary drift are assumed scenario parameters, not
measurements of Ollama or of real patients. Results describe this simulator only.
"""
import random
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.ai_analysis.models import VaultEdge, VaultNode
from apps.ai_analysis.services import build_context
from apps.clinical_notes.models import ClinicalNote
from apps.clinics.models import Clinic
from apps.patients.models import Patient
from apps.users.models import User, UserRole

PATIENTS = 20
SESSIONS = 60
SEED = 20261106
CONTEXT_LIMIT = 10
REMOTE_NOTES = 2
SCENARIOS = [(0.9, 1.0), (0.9, 0.7), (0.7, 1.0), (0.7, 0.7), (0.5, 0.7), (0.5, 0.4)]

# (concept, co-concept, paraphrase a later session may use instead of the concept).
EVENTS = [
    ("luto", "avô", "a perda que ainda dói"),
    ("demissão", "chefe", "quando saiu da empresa"),
    ("mudança", "cidade", "desde que deixou a terra natal"),
    ("separação", "casamento", "o fim da relação"),
    ("acidente", "estrada", "aquele susto no carro"),
]
ROUTINE = [
    "Relato de semana estável, com organização da rotina e cuidado com o sono.",
    "Conversa sobre planejamento de estudos e metas para o próximo mês.",
    "Discussão de pequenas tensões cotidianas e estratégias de pausa.",
    "Revisão das atividades combinadas e percepção geral de cansaço leve.",
]


def add_note(patient, author, text, days_ago):
    note = ClinicalNote.objects.create(patient=patient, author=author, raw_text=text)
    ClinicalNote.objects.filter(pk=note.pk).update(created_at=timezone.now() - timedelta(days=days_ago))
    note.refresh_from_db()
    return note


def link(note, source_label, target_label, nodes):
    def node(label):
        if label not in nodes:
            nodes[label] = VaultNode.objects.create(
                patient=note.patient, fingerprint=f"{note.patient_id}-{label}"[:64], kind="event", label=label,
                first_seen_at=note.created_at, last_seen_at=note.created_at,
            )
        return nodes[label]
    VaultEdge.objects.create(
        patient=note.patient, source=node(source_label), target=node(target_label), note=note, relation="associated",
        evidence=f"{source_label} {target_label}", observed_at=note.created_at, confidence=Decimal("0.800"),
    )


def build_patient(index, clinic, author, rng, extraction_recall, same_word_rate):
    patient = Patient.objects.create(clinic=clinic, internal_code=f"SYN-{index:03}", display_name=f"Pessoa Ficticia {index}", created_by=author)
    concept, partner, paraphrase = rng.choice(EVENTS)
    gold_session = rng.randint(2, SESSIONS - CONTEXT_LIMIT - 5)
    decoys = set(rng.sample([n for n in range(SESSIONS - CONTEXT_LIMIT - 1) if n != gold_session], 2))
    nodes, gold = {}, None
    for session in range(SESSIONS - 1):
        days_ago = (SESSIONS - session) * 7
        if session == gold_session:
            gold = add_note(patient, author, f"Registro sintético sobre {concept} envolvendo {partner}, com detalhes narrados na sessão.", days_ago)
            if rng.random() < extraction_recall:
                link(gold, concept, partner, nodes)
        elif session in decoys:
            # Decoys share one concept, as loosely related sessions do in real histories.
            decoy = add_note(patient, author, f"Menção breve a {concept} em meio a outros assuntos da rotina.", days_ago)
            link(decoy, concept, "rotina", nodes)
        else:
            add_note(patient, author, rng.choice(ROUTINE), days_ago)
    uses_same_word = rng.random() < same_word_rate
    current = f"Nesta sessão voltou a falar sobre {concept if uses_same_word else paraphrase} e sobre {partner if uses_same_word else 'como isso pesa'}."
    return patient, add_note(patient, author, current, 0), gold


def evaluate(extraction_recall, same_word_rate, settings):
    rng = random.Random(f"{SEED}-{extraction_recall}-{same_word_rate}")
    clinic = Clinic.objects.create(name=f"Sintetica {extraction_recall}-{same_word_rate}", document=f"{rng.randint(10**13, 10**14 - 1)}")
    author = User.objects.create_user(username=f"sint-{extraction_recall}-{same_word_rate}", password="unused", role=UserRole.PSYCHOLOGIST, clinic=clinic)
    settings.AI_LOD_MAX_REMOTE_NOTES = REMOTE_NOTES
    hits = {"recency": 0, "graph": 0, "graph+text": 0}
    chars = {"recency": 0, "graph": 0, "graph+text": 0, "full": 0}
    for index in range(PATIENTS):
        patient, anchor, gold = build_patient(index, clinic, author, rng, extraction_recall, same_word_rate)
        for strategy, enabled, source_search in (("recency", False, False), ("graph", True, False), ("graph+text", True, True)):
            settings.AI_LOD_RETRIEVAL = enabled
            settings.AI_LOD_SOURCE_SEARCH = source_search
            context = build_context(patient, CONTEXT_LIMIT, anchor=anchor)
            hits[strategy] += str(gold.id) in {item["note_id"] for item in context}
            chars[strategy] += sum(len(item["text"]) for item in context)
        chars["full"] += sum(len(note.raw_text) for note in ClinicalNote.objects.filter(patient=patient))
    return hits, chars


@pytest.mark.django_db
def test_print_layered_retrieval_table(settings):
    print(f"\n{PATIENTS} pacientes sintéticos, {SESSIONS} sessões, semente {SEED}, janela {CONTEXT_LIMIT}, até {REMOTE_NOTES} notas remotas")
    print("extração | mesma palavra | recência | só grafo | grafo+texto | chars recência | chars grafo+texto | chars histórico")
    for extraction_recall, same_word_rate in SCENARIOS:
        hits, chars = evaluate(extraction_recall, same_word_rate, settings)
        print(
            f"{extraction_recall:.0%} | {same_word_rate:.0%} | {hits['recency']}/{PATIENTS} | {hits['graph']}/{PATIENTS} | {hits['graph+text']}/{PATIENTS} | "
            f"{chars['recency'] // PATIENTS} | {chars['graph+text'] // PATIENTS} | {chars['full'] // PATIENTS}"
        )
