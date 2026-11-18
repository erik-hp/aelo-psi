"""Measure real note reading through the AI service code, on synthetic notes only.

Run explicitly from Backend, with one of the engines:
    OLLAMA_BASE_URL=http://127.0.0.1:11499 OLLAMA_MODEL=llama3.1 python tests/evaluate_extraction.py
    AELO_EVAL_ENGINE=claude AI_CLAUDE_MODEL=sonnet python tests/evaluate_extraction.py

The Claude engine sends these fixed synthetic notes to an external provider. It
exists only for this evaluation (ADR-004): never point it at real clinical text.
The gold concepts were written with the notes by the same author. Results describe
this small set, not real clinical text.
"""
import asyncio
import json
import os
import sys
import time
import unicodedata
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("AI_SERVICE_TOKEN", "evaluation-only")

from ai_service import main as ai  # noqa: E402

ALLOWED_KINDS = {"symptom", "event", "context", "intervention"}
ALLOWED_RELATIONS = {"co_occurs", "precedes", "reports", "associated"}

# (synthetic note, concepts a careful reader would be expected to keep)
NOTES = [
    ("Relata insônia há três semanas, desde a demissão. Diz acordar às quatro da manhã pensando nas contas.", ["insônia", "demissão"]),
    ("Chorou ao falar do luto pelo avô, que a criou. Evita visitar a casa antiga da família.", ["luto", "avô"]),
    ("Descreve crises de pânico no ônibus lotado e passou a ir a pé para o trabalho.", ["pânico", "ônibus"]),
    ("Conta que a separação do marido trouxe alívio, mas teme ficar sozinha nos fins de semana.", ["separação", "marido"]),
    ("Sente culpa por ter deixado a mãe no hospital para viajar a trabalho.", ["culpa", "mãe", "hospital"]),
    ("Tem discutido com o filho adolescente sobre a escola e sente que perdeu a autoridade em casa.", ["filho", "escola"]),
    ("Relata ansiedade antes das reuniões com o chefe e dor no peito nas manhãs de segunda-feira.", ["ansiedade", "chefe", "dor no peito"]),
    ("Voltou a beber aos fins de semana depois da mudança de cidade e diz não ter amigos por perto.", ["beber", "mudança de cidade"]),
    ("Lembra de um acidente de carro na infância e evita dirigir à noite até hoje.", ["acidente de carro", "dirigir"]),
    ("Diz que o trabalho voluntário na creche devolveu sentido à rotina depois da aposentadoria.", ["trabalho voluntário", "aposentadoria"]),
    ("Sonha repetidamente com o incêndio na padaria da família e acorda sobressaltado.", ["incêndio", "padaria"]),
    ("Sofreu bullying na escola e até hoje evita falar em público no curso.", ["bullying", "falar em público"]),
    ("Combinamos registrar o sono em um diário e praticar respiração antes de deitar.", ["diário", "respiração"]),
    ("Apresenta desânimo e perda de apetite desde o fim do namoro, há dois meses.", ["desânimo", "perda de apetite", "fim do namoro"]),
    ("Relata medo de perder o emprego após a reestruturação da empresa e tem dormido pouco.", ["medo de perder o emprego", "reestruturação"]),
    ("A gravidez inesperada reacendeu conflitos com a sogra sobre como criar a criança.", ["gravidez", "sogra"]),
    ("Sente vergonha do próprio corpo depois da cirurgia e deixou de ir à academia.", ["vergonha", "cirurgia", "academia"]),
    ("Comenta que a dívida do cartão aumentou e que esconde isso da esposa.", ["dívida", "esposa"]),
    ("Fala da solidão desde que os filhos saíram de casa e da falta que sente da rotina antiga.", ["solidão", "filhos"]),
    ("Lembra da morte do irmão no mês do aniversário dele e fica irritado com todos em casa.", ["morte do irmão", "irritado"]),
]


def plain(text):
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(char for char in decomposed if not unicodedata.combining(char)).casefold()


def rejected_by_service(extraction, text):
    """Mirror the validation in /vault/extract, which rejects the whole note on any failure."""
    nodes = extraction.nodes
    reasons = set()
    for node in nodes:
        if node.kind not in ALLOWED_KINDS:
            reasons.add("tipo de conceito")
        if not node.evidence or node.evidence not in text:
            reasons.add("evidência do conceito não literal")
        if node.label not in text:
            reasons.add("rótulo não literal")
    for edge in extraction.edges:
        if edge.relation not in ALLOWED_RELATIONS:
            reasons.add("tipo de relação")
        if edge.source < 0 or edge.target < 0 or edge.source >= len(nodes) or edge.target >= len(nodes) or edge.source == edge.target:
            reasons.add("índice de relação")
        if not edge.evidence or edge.evidence not in text:
            reasons.add("evidência da relação não literal")
    return sorted(reasons)


async def read_note(index, text, gold):
    item = ai.ContextItem(note_id=f"sintetica-{index}", created_at="2026-01-01T12:00:00+00:00", text=text)
    started = time.perf_counter()
    result = {"gold": len(gold)}
    try:
        extraction = await ai.ollama_vault(item)
    except Exception as exc:
        result.update(seconds=time.perf_counter() - started, error=type(exc).__name__, found=0, found_if_kept=0, kept=False, nodes=0, edges=0)
        return result
    def concepts_in(graph):
        labels = plain(" | ".join(node.label for node in graph.nodes))
        return sum(plain(concept) in labels for concept in gold)

    literal = ai.literal_graph(extraction, text)
    result.update(
        seconds=time.perf_counter() - started, error=None, kept=bool(literal.nodes), reasons=rejected_by_service(extraction, text),
        nodes=len(extraction.nodes), edges=len(extraction.edges), nodes_kept=len(literal.nodes), edges_kept=len(literal.edges),
        found_if_kept=concepts_in(extraction), found=concepts_in(literal),
    )
    return result


async def main():
    eval_engine = os.environ.get("AELO_EVAL_ENGINE", "ollama").strip().lower()
    limit = int(os.environ.get("AELO_EVAL_LIMIT", len(NOTES)))
    async with httpx.AsyncClient(timeout=httpx.Timeout(600.0, connect=5.0)) as client:
        ai.app.state.http_client = client
        if eval_engine in {"claude", "claude-cli"}:
            ai.AI_ENGINE = "claude-cli"
            version, engine = "claude-cli", ai.claude_cli.model()
        elif eval_engine == "gemini":
            ai.AI_ENGINE = "gemini"
            version, engine = "gemini-api", ai.frontier_providers.gemini_model()
        elif eval_engine == "anthropic":
            ai.AI_ENGINE = "anthropic"
            version, engine = "anthropic-api", ai.frontier_providers.anthropic_model()
        else:
            version = (await client.get(f"{ai.OLLAMA_BASE_URL}/api/version")).json()["version"]
            engine = ai.OLLAMA_MODEL
        results = []
        for index, (text, gold) in enumerate(NOTES[:limit]):
            outcome = await read_note(index, text, gold)
            results.append(outcome)
            print(f"nota {index + 1:02}: {outcome['seconds']:.1f}s nos={outcome.get('nodes_kept', 0)}/{outcome['nodes']} arestas={outcome.get('edges_kept', 0)}/{outcome['edges']} conceitos={outcome['found']}/{outcome['gold']} erro={outcome['error']} motivos={outcome.get('reasons', [])}", flush=True)
    seconds = sorted(item["seconds"] for item in results)
    summary = {
        "runtime": version, "model": engine, "notes": len(results),
        "notes_with_graph": sum(item["kept"] for item in results),
        "nodes_proposed": sum(item["nodes"] for item in results), "nodes_kept": sum(item.get("nodes_kept", 0) for item in results),
        "edges_proposed": sum(item["edges"] for item in results), "edges_kept": sum(item.get("edges_kept", 0) for item in results),
        "generation_errors": sum(item["error"] is not None for item in results),
        "gold_concepts": sum(item["gold"] for item in results),
        "found_before_validation": sum(item["found_if_kept"] for item in results),
        "found_after_validation": sum(item["found"] for item in results),
        "median_seconds": seconds[len(seconds) // 2], "max_seconds": seconds[-1],
    }
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
