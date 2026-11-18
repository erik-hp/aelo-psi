import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { VaultNodeInspector } from "./VaultNodeInspector";
import { VaultCytoscapeCanvas } from "./VaultCytoscapeCanvas";
import { VaultApprovalModal } from "./VaultApprovalModal";
import type { VaultGraph } from "@/types/vault";

type MockCy = { zoom: ReturnType<typeof vi.fn>; fit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };

const comprehensiveGraph: VaultGraph = {
  nodes: [
    {
      id: "node-symptom-1",
      kind: "symptom",
      label: "Insônia de manutenção",
      mention_count: 7,
      weight: "0.950",
      first_seen_at: "2026-01-15T08:00:00Z",
      last_seen_at: "2026-04-10T14:30:00Z",
    },
    {
      id: "node-context-1",
      kind: "context",
      label: "Turno noturno",
      mention_count: 4,
      weight: "0.720",
      first_seen_at: "2026-01-15T08:00:00Z",
      last_seen_at: "2026-03-20T10:00:00Z",
    },
    {
      id: "node-intervention-1",
      kind: "intervention",
      label: "Controle de estímulos",
      mention_count: 3,
      weight: "0.680",
      first_seen_at: "2026-02-05T09:00:00Z",
      last_seen_at: "2026-04-10T14:30:00Z",
    },
    {
      id: "node-event-1",
      kind: "event",
      label: "Promoção de cargo",
      mention_count: 1,
      weight: "0.450",
      first_seen_at: "2026-03-01T11:00:00Z",
      last_seen_at: "2026-03-01T11:00:00Z",
    },
    {
      id: "node-orphan",
      kind: "context",
      label: "Ambiente ruidoso",
      mention_count: 1,
      weight: "0.300",
      first_seen_at: "",
      last_seen_at: "",
    },
  ],
  edges: [
    {
      id: "edge-1",
      source: "node-symptom-1",
      target: "node-context-1",
      relation: "co_occurs",
      evidence: "Paciente relata que desperta no meio da noite especificamente após dias com escala noturna.",
      note_id: "note-real-101",
      observed_at: "2026-03-20T10:00:00Z",
      confidence: "0.890",
      weight: "0.850",
    },
    {
      id: "edge-2",
      source: "node-symptom-1",
      target: "node-intervention-1",
      relation: "associated",
      evidence: "Houve redução parcial da latência após aplicação das regras de controle de estímulos no quarto.",
      note_id: "note-real-102",
      observed_at: "2026-04-10T14:30:00Z",
      confidence: "0.940",
      weight: "0.900",
    },
    {
      id: "edge-dangling",
      source: "node-symptom-1",
      target: "non-existent-node-999",
      relation: "reports",
      evidence: "Citação com nó destino inexistente na topologia para testar resiliência a dados corrompidos.",
      note_id: "note-real-103",
      observed_at: "2026-04-11T12:00:00Z",
      confidence: "0.600",
      weight: "0.500",
    },
  ],
  communities: [
    ["node-symptom-1", "node-context-1"],
    ["node-intervention-1", "node-event-1"],
    ["node-orphan"],
  ],
  checkpoints: [],
};

// Mock cytoscape factory
vi.mock("cytoscape", () => {
  const mockCy = {
    zoom: vi.fn().mockReturnValue(1.0),
    fit: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
    nodes: vi.fn(() => []),
    batch: vi.fn((run: () => void) => run()),
  };
  const fn = Object.assign(vi.fn(() => mockCy), { use: vi.fn() });
  return {
    default: fn,
    __mockCy: mockCy,
  };
});

describe("Empirical Challenge: VaultNodeInspector Clinical Note Linking & Resiliency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("smoothly scrolls into view and applies visual highlight ring to the target note when present in DOM", () => {
    // 1. Create a simulated note DOM element that matches #note-{edge.note_id}
    const noteEl = document.createElement("div");
    noteEl.id = "note-note-real-101";
    const scrollIntoViewMock = vi.fn();
    noteEl.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(noteEl);

    const onSelectNote = vi.fn();
    render(
      <VaultNodeInspector
        graph={comprehensiveGraph}
        nodeId="node-symptom-1"
        onSelectNote={onSelectNote}
      />,
    );

    // Verify evidence and note button
    const noteBtn = screen.getByRole("button", { name: /Nota original nº note-real-101/i });
    expect(noteBtn).toBeInTheDocument();

    // 2. Click the note link
    fireEvent.click(noteBtn);

    // 3. Verify onSelectNote was called with note id
    expect(onSelectNote).toHaveBeenCalledWith("note-real-101");

    // 4. Verify scrollIntoView was called with smooth and center block
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });

    // 5. Verify highlight ring classes applied
    expect(noteEl).toHaveClass("ring-2");
    expect(noteEl).toHaveClass("ring-border-focus-ring");

    // 6. Fast-forward 2500ms and verify highlight ring is cleanly removed
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(noteEl).not.toHaveClass("ring-2");
    expect(noteEl).not.toHaveClass("ring-border-focus-ring");
  });

  it("handles missing target note element gracefully without DOM error or unhandled exceptions", () => {
    // Ensure no note elements exist in DOM
    const onSelectNote = vi.fn();
    render(
      <VaultNodeInspector
        graph={comprehensiveGraph}
        nodeId="node-symptom-1"
        onSelectNote={onSelectNote}
      />,
    );

    const noteBtn = screen.getByRole("button", { name: /Nota original nº note-real-102/i });
    expect(noteBtn).toBeInTheDocument();

    // Clicking when element is not in DOM should NOT throw any error
    expect(() => fireEvent.click(noteBtn)).not.toThrow();
    expect(onSelectNote).toHaveBeenCalledWith("note-real-102");
  });

  it("safely handles dangling edges where target node does not exist in graph", () => {
    render(
      <VaultNodeInspector
        graph={comprehensiveGraph}
        nodeId="node-symptom-1"
      />,
    );

    // Edge 3 links to non-existent-node-999
    expect(
      screen.getByText(/Citação com nó destino inexistente na topologia/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Relato direto/i)).toBeInTheDocument();
  });

  it("safely renders nodes without timestamp metadata without invalid date errors", () => {
    render(
      <VaultNodeInspector
        graph={comprehensiveGraph}
        nodeId="node-orphan"
      />,
    );

    expect(screen.getByText("Ambiente ruidoso")).toBeInTheDocument();
    expect(screen.getByText("Contexto")).toBeInTheDocument();
    // Does not render calendar date line if first_seen_at is undefined
    expect(screen.queryByText(/Primeira menção em/i)).toBeNull();
  });
});

describe("Empirical Challenge: VaultCytoscapeCanvas Zoom Math Across Screen Ratios", () => {
  let mockCy: MockCy;

  beforeEach(async () => {
    const mod = (await import("cytoscape")) as unknown as { __mockCy: MockCy };
    mockCy = mod.__mockCy;
    mockCy.zoom.mockClear().mockReturnValue(1.0);
    mockCy.fit.mockClear();
    mockCy.on.mockClear();
  });

  const testScreenSize = (
    name: string,
    width: number,
    height: number,
    expectedCenterX: number,
    expectedCenterY: number,
  ) => {
    it(`calculates exact center coordinate (${expectedCenterX}, ${expectedCenterY}) on ${name} (${width}x${height})`, () => {
      const { container } = render(
        <VaultCytoscapeCanvas graph={comprehensiveGraph} onSelectNode={vi.fn()} />,
      );

      const canvasDiv = container.querySelector('[role="img"]') as HTMLDivElement;
      vi.spyOn(canvasDiv, "getBoundingClientRect").mockReturnValue({
        width,
        height,
        top: 0,
        left: 0,
        bottom: height,
        right: width,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      const zoomInBtn = screen.getByRole("button", { name: /Aumentar zoom/i });
      fireEvent.click(zoomInBtn);

      expect(mockCy.zoom).toHaveBeenCalledWith({
        level: 1.25,
        renderedPosition: { x: expectedCenterX, y: expectedCenterY },
      });
    });
  };

  testScreenSize("Ultra-wide 21:9 Monitor", 3440, 1440, 1720, 720);
  testScreenSize("Full HD Desktop 16:9", 1920, 1080, 960, 540);
  testScreenSize("iPad Pro Landscape", 1366, 1024, 683, 512);
  testScreenSize("Mobile Portrait (iPhone 14)", 390, 844, 195, 422);
  testScreenSize("Foldable Cover Screen", 320, 640, 160, 320);

  it("applies reciprocal zoom level on zoom out without floating-point runaway", () => {
    const { container } = render(
      <VaultCytoscapeCanvas graph={comprehensiveGraph} onSelectNode={vi.fn()} />,
    );

    const canvasDiv = container.querySelector('[role="img"]') as HTMLDivElement;
    vi.spyOn(canvasDiv, "getBoundingClientRect").mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const zoomInBtn = screen.getByRole("button", { name: /Aumentar zoom/i });
    const zoomOutBtn = screen.getByRole("button", { name: /Diminuir zoom/i });

    // Step 1: Initial zoom = 1.0 -> Zoom In -> 1.25
    mockCy.zoom.mockReturnValue(1.0);
    fireEvent.click(zoomInBtn);
    expect(mockCy.zoom).toHaveBeenCalledWith({
      level: 1.25,
      renderedPosition: { x: 400, y: 300 },
    });

    // Step 2: Current zoom = 1.25 -> Zoom In -> 1.5625
    mockCy.zoom.mockReturnValue(1.25);
    fireEvent.click(zoomInBtn);
    expect(mockCy.zoom).toHaveBeenCalledWith({
      level: 1.5625,
      renderedPosition: { x: 400, y: 300 },
    });

    // Step 3: Current zoom = 1.5625 -> Zoom Out -> 1.25
    mockCy.zoom.mockReturnValue(1.5625);
    fireEvent.click(zoomOutBtn);
    expect(mockCy.zoom).toHaveBeenCalledWith({
      level: 1.25,
      renderedPosition: { x: 400, y: 300 },
    });

    // Step 4: Current zoom = 1.25 -> Zoom Out -> 1.0
    mockCy.zoom.mockReturnValue(1.25);
    fireEvent.click(zoomOutBtn);
    expect(mockCy.zoom).toHaveBeenCalledWith({
      level: 1.0,
      renderedPosition: { x: 400, y: 300 },
    });
  });
});

describe("Empirical Challenge: VaultApprovalModal Justification State Lifecycle", () => {
  it("resets justification state across modal open/close toggles and checkpoint change", () => {
    const { rerender } = render(
      <VaultApprovalModal
        open={true}
        busy={false}
        checkpointId="checkpoint-1"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText(/Justificativa clínica/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Revisão detalhada do checkpoint 1 aprovada pelo psicólogo." },
    });
    expect(textarea.value).toBe("Revisão detalhada do checkpoint 1 aprovada pelo psicólogo.");

    // Close modal
    rerender(
      <VaultApprovalModal
        open={false}
        busy={false}
        checkpointId="checkpoint-1"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // Reopen modal for a DIFFERENT checkpoint
    rerender(
      <VaultApprovalModal
        open={true}
        busy={false}
        checkpointId="checkpoint-2"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const reopenedTextarea = screen.getByLabelText(/Justificativa clínica/i) as HTMLTextAreaElement;
    // Empirically confirms the state is reset across different checkpoints to prevent rubber-stamping
    expect(reopenedTextarea.value).toBe("");
  });
});
