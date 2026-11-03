import { useEffect, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import fcose from "cytoscape-fcose";
import { Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VaultGraph } from "@/types/vault";

cytoscape.use(fcose);

export function VaultCytoscapeSkeleton() {
  return (
    <div className="flex h-[460px] w-full flex-col justify-between rounded-md border border-border bg-card/60 p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-44 rounded bg-muted/80" />
        <div className="h-7 w-20 rounded bg-muted/60" />
      </div>
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Renderizando topologia conceitual do grafo...</p>
      </div>
      <div className="flex gap-4">
        <div className="h-3 w-20 rounded bg-muted/50" />
        <div className="h-3 w-20 rounded bg-muted/50" />
        <div className="h-3 w-20 rounded bg-muted/50" />
      </div>
    </div>
  );
}

export function VaultCytoscapeCanvas({
  graph,
  onSelectNode,
}: {
  graph: VaultGraph;
  onSelectNode: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<Core | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const parent = new Map(
      graph.communities.flatMap((community, index) =>
        community.map((id) => [id, `community-${index}`] as const),
      ),
    );

    const elements: ElementDefinition[] = [
      ...graph.communities.map((_, index) => ({
        data: { id: `community-${index}`, label: `Comunidade ${index + 1}` },
      })),
      ...graph.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          kind: node.kind,
          parent: parent.get(node.id),
          weight: Number(node.weight),
        },
      })),
      ...graph.edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          confidence: Number(edge.confidence),
        },
      })),
    ];

    const cy = cytoscape({
      container: container.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": "11px",
            "text-wrap": "wrap",
            "text-max-width": "90px",
            "background-color": "#60a5fa",
            color: "#0f172a",
            "text-valign": "center",
            "text-halign": "center",
            width: "36px",
            height: "36px",
          },
        },
        {
          selector: 'node[kind = "symptom"]',
          style: { "background-color": "#f87171", color: "#ffffff" },
        },
        {
          selector: 'node[kind = "context"]',
          style: { "background-color": "#fbbf24", color: "#0f172a" },
        },
        {
          selector: 'node[kind = "intervention"]',
          style: { "background-color": "#34d399", color: "#0f172a" },
        },
        {
          selector: 'node[id ^= "community-"]',
          style: {
            "background-opacity": 0.06,
            "border-style": "dashed",
            "border-width": 2,
            "border-color": "#64748b",
            "text-valign": "top",
            "text-halign": "center",
            "font-size": "10px",
            color: "#64748b",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
      ],
      layout: {
        name: "fcose",
        quality: "proof",
        randomize: false,
        animate: false,
        packComponents: false,
      } as cytoscape.LayoutOptions,
    });

    cy.on("tap", "node", (event) => {
      if (!String(event.target.id()).startsWith("community-")) {
        onSelectNode(event.target.id());
      }
    });

    instance.current = cy;
    return () => {
      cy.destroy();
      instance.current = null;
    };
  }, [graph, onSelectNode]);

  // Controles de zoom ergonômicos calculados com centro dinâmico relativo ao container (Lei de Fitts)
  const handleZoom = (direction: "in" | "out") => {
    if (!instance.current || !container.current) return;
    const cy = instance.current;
    const rect = container.current.getBoundingClientRect();
    const factor = direction === "in" ? 1.25 : 1 / 1.25;
    cy.zoom({
      level: cy.zoom() * factor,
      renderedPosition: { x: rect.width / 2, y: rect.height / 2 },
    });
  };

  const handleFit = () => {
    if (!instance.current) return;
    instance.current.fit(undefined, 25);
  };

  return (
    <div className="space-y-2">
      {/* Container relativo do Grafo com Controles Flutuantes */}
      <div className="relative rounded-md border border-border bg-slate-950/20 overflow-hidden shadow-inner">
        <div
          ref={container}
          className="h-[460px] w-full"
          role="img"
          aria-label="Grafo interativo dos conceitos clínicos"
        />

        {/* Controles Flutuantes de Zoom (Lei de Fitts) */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-lg border border-border/80 bg-background/85 p-1 shadow-md backdrop-blur-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleZoom("in")}
            title="Aumentar zoom (+)"
            aria-label="Aumentar zoom"
            className="h-8 w-8 text-foreground hover:bg-secondary"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleZoom("out")}
            title="Diminuir zoom (-)"
            aria-label="Diminuir zoom"
            className="h-8 w-8 text-foreground hover:bg-secondary"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="my-0.5 border-t border-border/60" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleFit}
            title="Ajustar e centralizar grafo"
            aria-label="Ajustar e centralizar grafo"
            className="h-8 w-8 text-foreground hover:bg-secondary"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Legenda Cromática Formal dos Tipos de Nós no DOM (Lei de Jakob e Estética-Usabilidade) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-secondary/30 px-3 py-2 text-xs">
        <span className="font-semibold text-muted-foreground">Legenda dos Nós:</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-[#60a5fa] ring-1 ring-white/20" />
            <span>Conceito</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f87171] ring-1 ring-white/20" />
            <span>Sintoma</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24] ring-1 ring-white/20" />
            <span>Tema / Contexto</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-[#34d399] ring-1 ring-white/20" />
            <span>Intervenção</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded border border-dashed border-slate-400 bg-slate-500/10" />
            <span>Comunidade (Leiden)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
