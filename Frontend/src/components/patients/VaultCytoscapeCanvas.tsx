import { useEffect, useRef, useSyncExternalStore } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { RiAddLine, RiFullscreenLine, RiSubtractLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import type { VaultGraph } from "@/types/vault";

// Canvas colors are read once from CSS, so the graph is rebuilt when the theme class flips.
function useDarkClass() {
  return useSyncExternalStore(
    (notify) => {
      const observer = new MutationObserver(notify);
      observer.observe(document.documentElement, { attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
  );
}

export function VaultCytoscapeSkeleton() {
  return (
    <div className="flex h-[460px] w-full flex-col justify-between rounded-md border border-border-button-default bg-background-primary-default p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-44 rounded bg-background-tertiary-default" />
        <div className="h-7 w-20 rounded bg-background-tertiary-default" />
      </div>
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="h-12 w-12 rounded-full border-2 border-border-focus-ring border-t-border-focus-ring animate-spin" />
        <p className="text-caption-1-regular text-text-secondary">Montando o mapa de conceitos…</p>
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
  const dark = useDarkClass();

  useEffect(() => {
    if (!container.current) return;
    const styles = getComputedStyle(container.current);
    const color = (name: string) => styles.getPropertyValue(`--color-vault-${name}`).trim() || "CanvasText";
    const degree = new Map<string, number>();
    graph.edges.forEach((edge) => {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    });
    // A concept grows with every link it receives.
    const sizeOf = (id: string) => 12 + Math.min(30, (degree.get(id) ?? 0) * 7);

    // Each group of two or more concepts becomes a translucent area, so groups are visible on the map.
    const known = new Set(graph.nodes.map((node) => node.id));
    const parentOf = new Map<string, string>();
    const groups = graph.communities
      .map((community) => community.filter((id) => known.has(id) && !parentOf.has(id)))
      .filter((members) => members.length >= 2);
    groups.forEach((members, index) => members.forEach((id) => parentOf.set(id, `group-${index}`)));

    // A group is named after its most connected concept, using the note's own words (no interpretive label).
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const titleOf = (members: string[]) => {
      const central = members.reduce((best, id) =>
        (degree.get(id) ?? 0) > (degree.get(best) ?? 0) ||
        ((degree.get(id) ?? 0) === (degree.get(best) ?? 0) && (nodeById.get(id)?.mention_count ?? 0) > (nodeById.get(best)?.mention_count ?? 0))
          ? id
          : best,
      );
      return `Em torno de ${nodeById.get(central)?.label ?? ""}`;
    };

    const elements: ElementDefinition[] = [
      ...groups.map((members, index) => ({ data: { id: `group-${index}`, group: titleOf(members) } })),
      ...graph.nodes.map((node) => ({
        data: { id: node.id, label: node.label, kind: node.kind, size: sizeOf(node.id), ...(parentOf.has(node.id) ? { parent: parentOf.get(node.id) } : {}) },
      })),
      ...graph.edges.map((edge) => ({
        data: { id: edge.id, source: edge.source, target: edge.target },
      })),
    ];

    const tone = (name: string) => styles.getPropertyValue(`--color-${name}`).trim() || "CanvasText";
    const text = tone("text-secondary");
    const strong = tone("text-primary");
    const surface = tone("background-full");
    const accent = tone("border-focus-ring");

    const cy = cytoscape({
      container: container.current,
      elements,
      layout: { name: "preset" },
      minZoom: 0.3,
      maxZoom: 3,
      style: [
        {
          selector: "node:parent",
          style: {
            shape: "round-rectangle",
            "background-color": text,
            "background-opacity": 0.06,
            "border-width": 1,
            "border-style": "dashed",
            "border-color": text,
            "border-opacity": 0.35,
            padding: "22px",
            label: "data(group)",
            color: strong,
            "font-size": "13px",
            "font-weight": 600,
            "text-valign": "top",
            "text-halign": "center",
            "text-margin-y": -4,
            "text-wrap": "wrap",
            "text-max-width": "170px",
            "min-zoomed-font-size": 9,
          },
        },
        {
          selector: "node:childless",
          style: {
            width: "data(size)",
            height: "data(size)",
            "background-color": color("event"),
            "border-width": 0,
            label: "data(label)",
            color: text,
            "font-size": "13px",
            "min-zoomed-font-size": 9,
            "text-wrap": "wrap",
            "text-max-width": "110px",
            "text-valign": "bottom",
            "text-margin-y": 5,
            "text-outline-color": surface,
            "text-outline-width": 2,
            "underlay-color": color("event"),
            "underlay-opacity": 0.12,
            "underlay-padding": 5,
            "underlay-shape": "ellipse",
            "transition-property": "opacity, underlay-opacity",
            "transition-duration": 140,
          },
        },
        { selector: 'node[kind = "symptom"]', style: { "background-color": color("symptom"), "underlay-color": color("symptom") } },
        { selector: 'node[kind = "context"]', style: { "background-color": color("context"), "underlay-color": color("context") } },
        { selector: 'node[kind = "intervention"]', style: { "background-color": color("intervention"), "underlay-color": color("intervention") } },
        { selector: "node.hover", style: { color: strong, "underlay-opacity": 0.35, "z-index": 10 } },
        { selector: "node:selected", style: { color: strong, "border-width": 2, "border-color": accent, "underlay-opacity": 0.4 } },
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": color("edge"),
            "line-opacity": 0.4,
            "curve-style": "haystack",
            "haystack-radius": 0,
          },
        },
        { selector: "edge.hover", style: { "line-color": accent, "line-opacity": 0.9, width: 1.5 } },
        { selector: ".faded", style: { opacity: 0.1 } },
      ],
    });

    // Force simulation, in the spirit of a physical map: concepts repel, links pull, a weak
    // gravity keeps the cloud together. It runs live, so dragging a concept moves its neighbours.
    type Body = SimulationNodeDatum & { id: string };
    const bodies: Body[] = graph.nodes.map((node, index) => {
      const angle = (index / Math.max(1, graph.nodes.length)) * Math.PI * 2;
      return { id: node.id, x: Math.cos(angle) * 120, y: Math.sin(angle) * 120 };
    });
    const byId = new Map(bodies.map((body) => [body.id, body]));
    const links: SimulationLinkDatum<Body>[] = graph.edges
      .filter((edge) => byId.has(edge.source) && byId.has(edge.target))
      .map((edge) => ({ source: edge.source, target: edge.target }));
    // Members of one group are loosely tied together, so groups read as clusters.
    const ties: SimulationLinkDatum<Body>[] = graph.communities.flatMap((community) =>
      community
        .slice(1)
        .filter((id) => byId.has(id) && byId.has(community[0]))
        .map((id) => ({ source: community[0], target: id })),
    );

    const simulation = forceSimulation(bodies)
      .force("charge", forceManyBody<Body>().strength(-380).distanceMax(480))
      .force("link", forceLink<Body, SimulationLinkDatum<Body>>(links).id((body) => body.id).distance(90).strength(0.7))
      .force("ties", forceLink<Body, SimulationLinkDatum<Body>>(ties).id((body) => body.id).distance(80).strength(0.3))
      .force("collide", forceCollide<Body>((body) => sizeOf(body.id) / 2 + 40))
      .force("center", forceCenter(0, 0))
      .force("gravityX", forceX(0).strength(0.06))
      .force("gravityY", forceY(0).strength(0.06))
      .alphaDecay(0.02)
      .velocityDecay(0.35);

    // Concepts appear small and grow into their size, one after another, while the map settles.
    const born = performance.now();
    const grown = (id: string, index: number) => {
      const progress = Math.min(1, Math.max(0, (performance.now() - born - 45 * index) / 700));
      return Math.max(1, sizeOf(id) * (1 - (1 - progress) ** 3));
    };
    const sync = () =>
      cy.batch(() => {
        cy.nodes(":childless").forEach((node, index) => {
          const body = byId.get(node.id());
          if (body && !node.grabbed()) node.position({ x: body.x ?? 0, y: body.y ?? 0 });
          node.data("size", grown(node.id(), index));
        });
      });
    simulation.on("tick", sync);

    // Settle off-screen first so the map opens composed, then let it breathe live.
    simulation.stop();
    simulation.tick(160);
    sync();
    cy.fit(undefined, 40);
    simulation.alpha(0.25).restart();

    const pin = (id: string, x: number | null, y: number | null) => {
      const body = byId.get(id);
      if (body) {
        body.fx = x;
        body.fy = y;
      }
    };
    cy.on("grab", "node:childless", (event) => {
      pin(event.target.id(), event.target.position("x"), event.target.position("y"));
      simulation.alphaTarget(0.3).restart();
    });
    cy.on("drag", "node:childless", (event) => pin(event.target.id(), event.target.position("x"), event.target.position("y")));
    cy.on("free", "node:childless", (event) => {
      pin(event.target.id(), null, null);
      simulation.alphaTarget(0);
    });

    // Hover: the concept and its neighbours stay lit, everything else recedes.
    cy.on("mouseover", "node:childless", (event) => {
      const near = event.target.closedNeighborhood();
      cy.elements().not(near).addClass("faded");
      near.addClass("hover");
    });
    cy.on("mouseout", "node:childless", () => cy.elements().removeClass("faded hover"));

    cy.on("tap", "node:childless", (event) => {
      onSelectNode(event.target.id());
    });

    instance.current = cy;
    return () => {
      simulation.stop();
      cy.destroy();
      instance.current = null;
    };
  }, [graph, onSelectNode, dark]);

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
    instance.current.fit(undefined, 40);
  };

  return (
    <div className="space-y-2">
      {/* Container relativo do Grafo com Controles Flutuantes */}
      <div className="relative rounded-md border border-border-button-default overflow-hidden">
        <div
          ref={container}
          className="h-[520px] w-full"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 40%, var(--color-background-secondary-default), var(--color-background-full) 75%)",
          }}
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
            <RiAddLine className="h-4 w-4" />
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
            <RiSubtractLine className="h-4 w-4" />
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
            <RiFullscreenLine className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Legenda Cromática Formal dos Tipos de Nós no DOM (Lei de Jakob e Estética-Usabilidade) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-button-default bg-background-secondary-default px-3 py-2 text-caption-1-regular">
        <span className="text-body-semibold text-text-secondary">Legenda:</span>
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
        </div>
        <p className="basis-full text-text-secondary">
          Quanto maior o círculo, mais ligações o conceito tem. Linhas ligam conceitos que aparecem relacionados nas notas. Áreas tracejadas
          agrupam conceitos próximos e não configuram diagnóstico.
        </p>
      </div>
    </div>
  );
}
