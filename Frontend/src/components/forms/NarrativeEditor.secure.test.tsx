import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const drafts = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), remove: vi.fn() }));
vi.mock("@/services/runtime", () => ({ isApiMode: true }));
vi.mock("@/services/clinicalDraftService", () => ({ clinicalDraftService: drafts }));

import { NarrativeEditor } from "./NarrativeEditor";

describe("server-backed clinical drafts", () => {
  beforeEach(() => {
    localStorage.clear();
    drafts.get.mockReset().mockResolvedValue(null);
    drafts.put.mockReset().mockResolvedValue(1);
    drafts.remove.mockReset().mockResolvedValue(undefined);
    vi.restoreAllMocks();
  });

  it("autosaves to the server and never writes new clinical text to localStorage", async () => {
    render(<NarrativeEditor patientId="patient-1" />);
    await waitFor(() => expect(drafts.get).toHaveBeenCalledWith("patient-1"));
    const textarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i });
    fireEvent.change(textarea, { target: { value: "Nota sintética longa para provar que o autosave usa somente o servidor." } });
    await waitFor(() => expect(drafts.put).toHaveBeenCalledWith("patient-1", expect.objectContaining({ version: 0, content: expect.stringContaining("Nota sintética longa") })), { timeout: 2000 });
    expect(localStorage.getItem("draft_narrative_patient-1")).toBeNull();
  });

  it("imports a legacy draft only after explicit confirmation and removes its local copy", async () => {
    localStorage.setItem("draft_narrative_patient-2", JSON.stringify({ title: "Synthetic title", content: "Synthetic old draft" }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<NarrativeEditor patientId="patient-2" />);
    await waitFor(() => expect(drafts.put).toHaveBeenCalledWith("patient-2", { title: "Synthetic title", content: "Synthetic old draft", version: 0 }));
    expect(localStorage.getItem("draft_narrative_patient-2")).toBeNull();
    expect((screen.getByRole("textbox", { name: /Nota narrativa da sessão/i }) as HTMLTextAreaElement).value).toBe("Synthetic old draft");
  });

  it("waits for an in-flight autosave before deleting a draft", async () => {
    let finishSave: (() => void) | undefined;
    drafts.put.mockImplementationOnce(() => new Promise<number>((resolve) => {
      finishSave = () => resolve(1);
    }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<NarrativeEditor patientId="patient-3" />);
    await waitFor(() => expect(drafts.get).toHaveBeenCalledWith("patient-3"));
    fireEvent.change(screen.getByRole("textbox", { name: /Nota narrativa da sessão/i }), {
      target: { value: "Nota sintética durante salvamento assíncrono." },
    });
    await waitFor(() => expect(drafts.put).toHaveBeenCalledTimes(1), { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: /Limpar rascunho/i }));
    expect(drafts.remove).not.toHaveBeenCalled();
    finishSave?.();
    await waitFor(() => expect(drafts.remove).toHaveBeenCalledWith("patient-3"));
    expect((screen.getByRole("textbox", { name: /Nota narrativa da sessão/i }) as HTMLTextAreaElement).value).toBe("");
    await new Promise((resolve) => setTimeout(resolve, 750));
    expect(drafts.put).toHaveBeenCalledTimes(1);
  });
});
