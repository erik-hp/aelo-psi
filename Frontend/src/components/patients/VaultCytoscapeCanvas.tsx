import { useEffect, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import fcose from "cytoscape-fcose";
import { Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VaultGraph } from "@/types/vault";

cytoscape.use(fcose);

export function VaultCytoscapeSkeleton() {
  return (
    <div className="flex h-[460px] w-full flex-col justify-between rounded-md border border-border-button-default bg-background-primary-default p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-44 rounded bg-background-tertiary-default" />
        <div className="h-7 w-20 rounded bg-background-tertiary-default" />
      </div>
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="h-12 w-12 rounded-full border-2 border-border-focus-ring border-t-border-focus-ring animate-spin" />
        <p className="text-caption-1-regular text-text-secondary">Renderizando topologia conceitual do grafo...</p>
      </div>
      <div className="flex gap-4">
        <div className="h-3 w-20 rounded bg-background-tertiary-default" />
        <div className="h-3 w-20 rounded bg-background-tertiary-default" />
        <div className="h-3 w-20 rounded bg-background-tertiary-default" />
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
    const styles = getComputedStyle(container.current);
    const color = (name: string) => styles.getPropertyValue(`--color-vault-${name}`).trim() || "CanvasText";
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
            "background-color": color("event"),
            color: color("node-text"),
            "text-valign": "center",
            "text-halign": "center",
            width: "36px",
            height: "36px",
          },
        },
        {
          selector: 'node[kind = "symptom"]',
          style: { "background-color": color("symptom"), color: color("symptom-text") },
        },
        {
          selector: 'node[kind = "context"]',
          style: { "background-color": color("context"), color: color("node-text") },
        },
        {
          selector: 'node[kind = "intervention"]',
          style: { "background-color": color("intervention"), color: color("node-text") },
        },
        {
          selector: 'node[id ^= "community-"]',
          style: {
            "background-opacity": 0.06,
            "border-style": "dashed",
            "border-width": 2,
            "border-color": color("community"),
            "text-valign": "top",
            "text-halign": "center",
            "font-size": "10px",
            color: color("community"),
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": color("edge"),
            "target-arrow-color": color("edge"),
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
      <div className="relative rounded-md border border-border-button-default bg-background-secondary-default overflow-hidden shadow-inner">
        <div
          ref={container}
          className="h-[460px] w-full"
          role="img"
          aria-label="Grafo interativo dos conceitos clínicos"
        />

        {/* Controles Flutuantes de Zoom (Lei de Fitts) */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-lg border border-border-button-default bg-background-full p-1 shadow-md backdrop-blur-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleZoom("in")}
            title="Aumentar zoom (+)"
            aria-label="Aumentar zoom"
            className="h-8 w-8 text-text-primary hover:bg-background-secondary-default"
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
            className="h-8 w-8 text-text-primary hover:bg-background-secondary-default"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="my-0.5 border-t border-border-button-default" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleFit}
            title="Ajustar e centralizar grafo"
            aria-label="Ajustar e centralizar grafo"
            className="h-8 w-8 text-text-primary hover:bg-background-secondary-default"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Legenda Cromática Formal dos Tipos de Nós no DOM (Lei de Jakob e Estética-Usabilidade) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-button-default bg-background-secondary-default px-3 py-2 text-caption-1-regular">
        <span className="text-body-semibold text-text-secondary">Legenda dos Nós:</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-full bg-vault-event ring-1 ring-border-button-default" />
            <span>Conceito</span>
          </span>
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-full bg-vault-symptom ring-1 ring-border-button-default" />
            <span>Sintoma</span>
          </span>
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-full bg-vault-context ring-1 ring-border-button-default" />
            <span>Tema / Contexto</span>
          </span>
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-full bg-vault-intervention ring-1 ring-border-button-default" />
            <span>Intervenção</span>
          </span>
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="h-2.5 w-2.5 rounded border border-dashed border-border-button-default bg-background-secondary-default" />
            <span>Comunidade (Leiden)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
