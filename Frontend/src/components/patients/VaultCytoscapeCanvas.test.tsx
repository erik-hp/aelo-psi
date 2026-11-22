import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VaultCytoscapeCanvas, VaultCytoscapeSkeleton } from "./VaultCytoscapeCanvas";
import type { VaultGraph } from "@/types/vault";

type MockCy = { zoom: ReturnType<typeof vi.fn>; fit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };

const mockGraph: VaultGraph = {
  nodes: [
    {
      id: "node-1",
      kind: "symptom",
      label: "Insônia inicial",
      mention_count: 5,
      weight: "0.85",
      first_seen_at: "2026-01-10T10:00:00Z",
      last_seen_at: "2026-03-15T11:00:00Z",
    },
    {
      id: "node-2",
      kind: "intervention",
      label: "Higiene do sono",
      mention_count: 3,
      weight: "0.70",
      first_seen_at: "2026-02-01T10:00:00Z",
      last_seen_at: "2026-03-15T11:00:00Z",
    },
    {
      id: "node-3",
      kind: "context",
      label: "Trabalho noturno",
      mention_count: 2,
      weight: "0.50",
      first_seen_at: "2026-02-10T10:00:00Z",
      last_seen_at: "2026-03-15T11:00:00Z",
    },
  ],
  edges: [
    {
      id: "edge-1",
      source: "node-1",
      target: "node-2",
      relation: "associated",
      evidence: "Paciente relata relação entre insônia e higiene do sono.",
      note_id: "note-101",
      observed_at: "2026-03-15T11:00:00Z",
      confidence: "0.92",
      weight: "0.8",
    },
  ],
  communities: [["node-1", "node-2"], ["node-3"]],
  checkpoints: [],
};

// Mock cytoscape factory to stress-test the component's interaction with the Cytoscape Core instance
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

describe("VaultCytoscapeSkeleton", () => {
  it("renders loading skeleton with pulse effect and accessibility text", () => {
    render(<VaultCytoscapeSkeleton />);
    expect(
      screen.getByText(/Montando o mapa de conceitos…/i),
    ).toBeDefined();
  });
});

describe("VaultCytoscapeCanvas", () => {
  let mockCy: MockCy;

  beforeEach(async () => {
    const mod = await import("cytoscape") as unknown as { __mockCy: MockCy };
    mockCy = mod.__mockCy;
    mockCy.zoom.mockClear().mockReturnValue(1.0);
    mockCy.fit.mockClear();
    mockCy.on.mockClear();
    mockCy.destroy.mockClear();
  });

  it("renders container, floating zoom controls, and chromatic legend", () => {
    const onSelectNode = vi.fn();
    render(<VaultCytoscapeCanvas graph={mockGraph} onSelectNode={onSelectNode} />);

    // Legend
    expect(screen.getByText("Legenda:")).toBeDefined();
    expect(screen.getByText("Conceito")).toBeDefined();
    expect(screen.getByText("Sintoma")).toBeDefined();
    expect(screen.getByText("Tema / Contexto")).toBeDefined();
    expect(screen.getByText("Intervenção")).toBeDefined();

    // Floating controls
    const zoomInBtn = screen.getByRole("button", { name: /Aumentar zoom/i });
    const zoomOutBtn = screen.getByRole("button", { name: /Diminuir zoom/i });
    const fitBtn = screen.getByRole("button", { name: /Ajustar e centralizar grafo/i });

    expect(zoomInBtn).toBeDefined();
    expect(zoomOutBtn).toBeDefined();
    expect(fitBtn).toBeDefined();
  });

  it("calculates dynamic relative coordinates for zoom in and zoom out across varying container dimensions", () => {
    const onSelectNode = vi.fn();
    const { container } = render(
      <VaultCytoscapeCanvas graph={mockGraph} onSelectNode={onSelectNode} />,
    );

    const canvasDiv = container.querySelector('[role="img"]') as HTMLDivElement;
    expect(canvasDiv).toBeDefined();

    // Scenario 1: Standard Desktop (1000px width x 600px height)
    vi.spyOn(canvasDiv, "getBoundingClientRect").mockReturnValue({
      width: 1000,
      height: 600,
      top: 50,
      left: 100,
      bottom: 650,
      right: 1100,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    const zoomInBtn = screen.getByRole("button", { name: /Aumentar zoom/i });
    const zoomOutBtn = screen.getByRole("button", { name: /Diminuir zoom/i });
    const fitBtn = screen.getByRole("button", { name: /Ajustar e centralizar grafo/i });

    // Zoom IN on Desktop
    fireEvent.click(zoomInBtn);
    expect(mockCy.zoom).toHaveBeenCalledWith({
      level: 1.25, // 1.0 * 1.25
      renderedPosition: { x: 500, y: 300 }, // 1000 / 2, 600 / 2
    });

    // Zoom OUT on Desktop
    mockCy.zoom.mockReturnValue(1.25);
    fireEvent.click(zoomOutBtn);
    expect(mockCy.zoom).toHaveBeenCalledWith({
      level: 1.0, // 1.25 * (1 / 1.25)
      renderedPosition: { x: 500, y: 300 },
    });

    // Fit Graph
    fireEvent.click(fitBtn);
    expect(mockCy.fit).toHaveBeenCalledWith(undefined, 40);

    // Scenario 2: Mobile Screen Resize (360px width x 480px height)
    vi.spyOn(canvasDiv, "getBoundingClientRect").mockReturnValue({
      width: 360,
      height: 480,
      top: 20,
      left: 10,
      bottom: 500,
      right: 370,
      x: 10,
      y: 20,
      toJSON: () => {},
    });

    mockCy.zoom.mockReturnValue(1.0);
    fireEvent.click(zoomInBtn);
    expect(mockCy.zoom).toHaveBeenCalledWith({
      level: 1.25,
      renderedPosition: { x: 180, y: 240 }, // Dynamically updated: 360 / 2, 480 / 2
    });

    // Scenario 3: Boundary condition (0x0 container)
    vi.spyOn(canvasDiv, "getBoundingClientRect").mockReturnValue({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    mockCy.zoom.mockReturnValue(1.0);
    fireEvent.click(zoomOutBtn);
    expect(mockCy.zoom).toHaveBeenCalledWith({
      level: 0.8, // 1.0 / 1.25
      renderedPosition: { x: 0, y: 0 },
    });
  });

  it("handles node selection event", () => {
    const onSelectNode = vi.fn();
    render(<VaultCytoscapeCanvas graph={mockGraph} onSelectNode={onSelectNode} />);

    // Verify tap listener was attached
    expect(mockCy.on).toHaveBeenCalledWith("tap", "node:childless", expect.any(Function));
    const tapHandler = mockCy.on.mock.calls.find((call) => call[0] === "tap" && call[1] === "node:childless")![2] as (event: { target: { id: () => string } }) => void;

    // Simulating tap on a clinical node
    tapHandler({ target: { id: () => "node-1" } });
    expect(onSelectNode).toHaveBeenCalledWith("node-1");

  });
});
