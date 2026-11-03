import html
import json
from decimal import Decimal

from django.utils import timezone


def safe_line(value):
    value = html.escape(" ".join(value.split()), quote=True)
    for character in ("\\", "`", "*", "_", "[", "]", "<", ">", "#", "|", "!"):
        value = value.replace(character, f"\\{character}")
    return value


def render_checkpoint_markdown(
    *,
    checkpoint_id,
    patient,
    analysis,
    note,
    raw_nodes,
    raw_edges,
    claims,
    all_nodes,
    all_edges,
    communities,
    centrality,
    ranked_nodes,
):
    """Render a validated graph snapshot without performing database writes."""
    node_by_id = {str(node.id): node for node in all_nodes}
    lines = [
        "---",
        "type: aelo-vault-checkpoint",
        f"checkpoint_id: {json.dumps(str(checkpoint_id))}",
        f"patient_id: {json.dumps(str(patient.pk))}",
        f"analysis_id: {json.dumps(str(analysis.pk))}",
        f"source_note_id: {json.dumps(str(note.pk))}",
        f"source_session_id: {json.dumps(str(note.session_id) if note.session_id else '')}",
        f"created_at: {json.dumps(timezone.now().isoformat())}",
        "review_status_at_creation: pending",
        f"total_nodes: {len(all_nodes)}",
        f"total_edges: {len(all_edges)}",
        f"leiden_communities: {len(communities)}",
        "---",
        "",
        "# Checkpoint clínico — revisão pendente",
        "",
        "Conteúdo assistivo; confirme cada evidência no prontuário antes de qualquer decisão clínica.",
        "",
        "## 1. Análise do Ponto — sessão atual",
        "",
    ]
    lines += [
        f"- {safe_line(item['kind'])}: {safe_line(item['label'])} — evidência: “{safe_line(item['evidence'])}” (nota `{note.pk}`)"
        for item in raw_nodes
    ]
    lines += [
        f"- Conexão: {safe_line(raw_nodes[item['source']]['label'])} → {safe_line(item['relation'])} → {safe_line(raw_nodes[item['target']]['label'])}; peso {Decimal(str(item.get('confidence', 0))):.3f}; evidência: “{safe_line(item['evidence'])}” (nota `{note.pk}`)"
        for item in raw_edges
    ]
    if not raw_nodes:
        lines.append("- Nenhuma entidade com evidência literal foi extraída.")
    lines += [
        f"- Observação assistiva: {safe_line(claim['text'])} — “{safe_line(claim['excerpt'])}” (nota `{claim['note_id']}`)"
        for claim in claims
        if claim["kind"] == "local"
    ]
    lines += ["", "## 2. Análise do Todo — contraste longitudinal", ""]
    lines += [
        f"- {'Questão para revisão' if claim['kind'] == 'question' else 'Observação assistiva'}: {safe_line(claim['text'])} — “{safe_line(claim['excerpt'])}” (nota `{claim['note_id']}`)"
        for claim in claims
        if claim["kind"] != "local"
    ]
    if not any(claim["kind"] != "local" for claim in claims):
        lines.append(
            "- Nenhuma discrepância fundamentada foi proposta; ausência de alerta não implica ausência de risco."
        )
    lines += [
        "",
        "## 3. Topologia atual do Vault",
        "",
        f"- Nós: {len(all_nodes)}",
        f"- Relações: {len(all_edges)}",
        f"- Comunidades Leiden: {len(communities)}",
        "",
        "### Temas de maior centralidade ponderada",
        "",
    ]
    lines += [
        f"- {safe_line(node.label)} — centralidade {centrality[node.id]:.3f}; menções {node.mention_count}"
        for node in ranked_nodes
    ]
    lines += ["", "### Comunidades temáticas", ""]
    lines += [
        f"- Comunidade {index}: "
        + ", ".join(safe_line(node_by_id[node_id].label) for node_id in group)
        for index, group in enumerate(communities, start=1)
    ]
    lines += [
        "",
        "## 4. Fontes e rastreabilidade",
        "",
        "### Linha do tempo de relações",
        "",
    ]
    lines += [
        f"- {edge.observed_at.date()}: {safe_line(edge.source.label)} → {safe_line(edge.relation)} → {safe_line(edge.target.label)}; evidência: “{safe_line(edge.evidence)}” (nota `{edge.note_id}`)"
        for edge in all_edges
    ]
    if not all_edges:
        lines.append("- Nenhuma relação documentada até este checkpoint.")
    lines += [
        "",
        "## Auditoria e limites",
        "",
        "- Cada relação acima está vinculada a uma nota fonte e a um trecho literal.",
        "- Comunidades são agrupamentos de topologia, não diagnósticos.",
        "- Métricas RAGAS e inferências clínicas não foram calculadas neste checkpoint.",
        "- Aprovação ética depende da revisão assinada da análise vinculada.",
        "",
    ]
    return "\n".join(lines)
