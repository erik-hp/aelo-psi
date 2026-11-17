import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VaultNodeInspector } from "./VaultNodeInspector";
import type { VaultGraph } from "@/types/vault";

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
  ],
  edges: [
    {
      id: "edge-1",
      source: "node-1",
      target: "node-2",
      relation: "associated",
      evidence: "Paciente relata que demorou mais de duas horas para adormecer nas últimas três noites.",
      note_id: "note-101",
      observed_at: "2026-03-15T11:00:00Z",
      confidence: "0.92",
      weight: "0.8",
    },
  ],
  communities: [["node-1", "node-2"]],
  checkpoints: [],
};

describe("VaultNodeInspector", () => {
  it("renders empty state placeholder when no node is selected", () => {
    render(<VaultNodeInspector graph={mockGraph} nodeId={null} />);
    expect(screen.getByText(/Nenhum conceito selecionado/i)).toBeDefined();
  });

  it("renders node details, kind badge, and Gestalt proximity evidence quote when node is selected", () => {
    const onSelectNote = vi.fn();
    render(<VaultNodeInspector graph={mockGraph} nodeId="node-1" onSelectNote={onSelectNote} />);

    // Node header and badge
    expect(screen.getByText("Insônia inicial")).toBeDefined();
    expect(screen.getByText("Sintoma")).toBeDefined();
    expect(screen.getByText(/5 menções/i)).toBeDefined();

    // Literal evidence quote blockquote
    expect(
      screen.getByText(/Paciente relata que demorou mais de duas horas para adormecer/i),
    ).toBeDefined();

    // Navigable note reference button
    const noteBtn = screen.getByRole("button", { name: /Nota original nº note-101/i });
    expect(noteBtn).toBeDefined();

    fireEvent.click(noteBtn);
    expect(onSelectNote).toHaveBeenCalledWith("note-101");
  });
});
