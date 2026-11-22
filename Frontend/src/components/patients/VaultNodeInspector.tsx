import { RiCalendarLine, RiCursorLine, RiDoubleQuotesL, RiExternalLinkLine, RiFileTextLine } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VaultGraph, VaultNodeKind, VaultRelationType } from "@/types/vault";

const KIND_LABELS: Record<VaultNodeKind, { label: string; variant: "default" | "success" | "warning" | "critical" }> = {
  symptom: { label: "Sintoma", variant: "critical" },
  intervention: { label: "Intervenção", variant: "success" },
  context: { label: "Contexto", variant: "warning" },
  event: { label: "Evento", variant: "default" },
};

const RELATION_LABELS: Record<VaultRelationType, string> = {
  co_occurs: "Coocorrência",
  precedes: "Precedência temporal",
  reports: "Relato direto",
  associated: "Associação clínica",
};

export interface VaultNodeInspectorProps {
  graph: VaultGraph;
  nodeId: string | null;
  onSelectNote?: (noteId: string) => void;
}

export function VaultNodeInspector({ graph, nodeId, onSelectNote }: VaultNodeInspectorProps) {
  const selected = graph.nodes.find((node) => node.id === nodeId);
  const edges = graph.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);

  if (!selected) {
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-lg border border-dashed border-border-button-default p-6 text-center text-body-regular text-text-secondary">
        <RiCursorLine className="mb-2 h-8 w-8 text-text-secondary" />
        <p className="text-body-medium text-text-primary">Nenhum conceito selecionado</p>
        <p className="mt-1 max-w-xs text-caption-1-regular">
          Clique em qualquer conceito no mapa para inspecionar as evidências literais citadas pelo paciente e sua rastreabilidade no prontuário.
        </p>
      </div>
    );
  }

  const kindInfo = KIND_LABELS[selected.kind] ?? { label: selected.kind, variant: "default" };

  return (
    <div className="space-y-4 rounded-lg border border-border-button-default bg-background-primary-default p-4 text-body-regular">
      {/* Cabeçalho do Nó Selecionado */}
      <div className="border-b border-border-button-default pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={kindInfo.variant}>{kindInfo.label}</Badge>
          <span className="text-caption-1-regular text-text-secondary">
            {selected.mention_count} {selected.mention_count === 1 ? "menção" : "menções"}, peso {selected.weight}
          </span>
        </div>
        <h3 className="mt-2 text-headline-semibold text-text-primary">{selected.label}</h3>
        {selected.first_seen_at && (
          <p className="mt-1 flex items-center gap-1.5 text-caption-1-regular text-text-secondary">
            <RiCalendarLine className="h-3.5 w-3.5" />
            Primeira menção em {new Date(selected.first_seen_at).toLocaleDateString("pt-BR")}
            {selected.last_seen_at && selected.last_seen_at !== selected.first_seen_at
              ? `, mais recente em ${new Date(selected.last_seen_at).toLocaleDateString("pt-BR")}`
              : ""}
          </p>
        )}
      </div>

      {/* Lista de Relações e Evidências Literais (Lei da Proximidade da Gestalt) */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-1.5 text-caption-1-semibold text-text-secondary">
          <RiDoubleQuotesL className="h-3.5 w-3.5 text-status-blue-text" />
          Evidências literais no prontuário ({edges.length})
        </h4>

        {edges.length === 0 ? (
          <p className="text-caption-1-regular text-text-secondary">Nenhuma relação direta registrada para este nó.</p>
        ) : (
          <ScrollArea className="max-h-[360px] space-y-3 pe-1" aria-label="Evidências da entidade selecionada">
            {edges.map((edge) => {
              const otherNodeId = edge.source === nodeId ? edge.target : edge.source;
              const otherNode = graph.nodes.find((n) => n.id === otherNodeId);
              const relationName = RELATION_LABELS[edge.relation] || edge.relation;

              return (
                <div
                  key={edge.id}
                  className="rounded-md border border-border-button-default bg-background-secondary-default p-3 transition-colors hover:border-border-focus-ring hover:bg-background-secondary-default"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-caption-1-regular">
                    <span className="text-body-medium text-text-primary">
                      {relationName} {otherNode ? `→ ${otherNode.label}` : ""}
                    </span>
                    <Badge variant="muted" className="text-caption-2-regular">
                      peso {edge.weight}
                    </Badge>
                  </div>

                  {/* Citação literal destacada com proximidade visual imediata */}
                  <blockquote className="aelo-record my-2 max-w-none border-s-2 border-border-focus-ring ps-3 text-text-primary">
                    “{edge.evidence}”
                  </blockquote>

                  {/* Conexão navegável contígua com a nota original de referência */}
                  <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-border-button-default text-caption-1-regular text-text-secondary">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectNote?.(edge.note_id);
                        const el = document.getElementById(`note-${edge.note_id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                          el.classList.add("ring-2", "ring-border-focus-ring");
                          setTimeout(() => el.classList.remove("ring-2", "ring-border-focus-ring"), 2500);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-body-medium text-status-blue-text hover:underline hover:text-status-blue-text transition-colors"
                      title={`Ver contexto completo na nota nº ${edge.note_id}`}
                    >
                      <RiFileTextLine className="h-3 w-3" />
                      Nota original nº {edge.note_id}
                      <RiExternalLinkLine className="h-2.5 w-2.5 opacity-70" />
                    </button>
                    <span>{new Date(edge.observed_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
