import { Calendar, ExternalLink, FileText, MousePointerClick, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <MousePointerClick className="mb-2 h-8 w-8 text-muted-foreground/60" />
        <p className="font-medium text-foreground">Nenhum nó selecionado</p>
        <p className="mt-1 max-w-xs text-xs">
          Clique em qualquer entidade no grafo para inspecionar as evidências literais citadas pelo paciente e sua rastreabilidade no prontuário.
        </p>
      </div>
    );
  }

  const kindInfo = KIND_LABELS[selected.kind] ?? { label: selected.kind, variant: "default" };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-sm shadow-sm">
      {/* Cabeçalho do Nó Selecionado */}
      <div className="border-b border-border pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={kindInfo.variant}>{kindInfo.label}</Badge>
          <span className="text-xs text-muted-foreground">
            {selected.mention_count} {selected.mention_count === 1 ? "menção" : "menções"} · peso {selected.weight}
          </span>
        </div>
        <h3 className="mt-2 text-base font-semibold text-foreground">{selected.label}</h3>
        {selected.first_seen_at && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Primeira menção em {new Date(selected.first_seen_at).toLocaleDateString("pt-BR")}
            {selected.last_seen_at && selected.last_seen_at !== selected.first_seen_at
              ? ` · mais recente em ${new Date(selected.last_seen_at).toLocaleDateString("pt-BR")}`
              : ""}
          </p>
        )}
      </div>

      {/* Lista de Relações e Evidências Literais (Lei da Proximidade da Gestalt) */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Quote className="h-3.5 w-3.5 text-primary" />
          Evidências Literais no Prontuário ({edges.length})
        </h4>

        {edges.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma relação direta registrada para este nó.</p>
        ) : (
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {edges.map((edge) => {
              const otherNodeId = edge.source === nodeId ? edge.target : edge.source;
              const otherNode = graph.nodes.find((n) => n.id === otherNodeId);
              const relationName = RELATION_LABELS[edge.relation] || edge.relation;

              return (
                <div
                  key={edge.id}
                  className="rounded-md border border-border/80 bg-secondary/30 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                    <span className="font-medium text-foreground">
                      {relationName} {otherNode ? `→ ${otherNode.label}` : ""}
                    </span>
                    <Badge variant="muted" className="text-[10px]">
                      peso {edge.weight}
                    </Badge>
                  </div>

                  {/* Citação literal destacada com proximidade visual imediata */}
                  <blockquote className="my-2 rounded-r border-l-2 border-primary/60 bg-background/60 py-2 pl-3 pr-2 text-xs italic leading-relaxed text-foreground font-serif">
                    “{edge.evidence}”
                  </blockquote>

                  {/* Conexão navegável contígua com a nota original de referência */}
                  <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectNote?.(edge.note_id);
                        const el = document.getElementById(`note-${edge.note_id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                          el.classList.add("ring-2", "ring-primary");
                          setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
                        }
                      }}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
                      title={`Ver contexto completo na nota nº ${edge.note_id}`}
                    >
                      <FileText className="h-3 w-3" />
                      Nota original nº {edge.note_id}
                      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                    </button>
                    <span>{new Date(edge.observed_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
