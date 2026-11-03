import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NarrativeEditor } from "./NarrativeEditor";

describe("NarrativeEditor", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders with default values and clinical template scaffolds", () => {
    render(<NarrativeEditor patientId="p-123" />);

    expect(screen.getByLabelText(/Título da nota clínica/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Template SOAP/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Template DAP/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Solicitar análise assistiva/i })).toBeDefined();
  });

  it("injects SOAP template when template button is clicked", async () => {
    const user = userEvent.setup();
    render(<NarrativeEditor patientId="p-123" />);

    const soapBtn = screen.getByRole("button", { name: /Template SOAP/i });
    await user.click(soapBtn);

    const textarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i }) as HTMLTextAreaElement;
    expect(textarea.value).toContain("[S - SUBJETIVO]");
    expect(textarea.value).toContain("[O - OBJETIVO]");
    expect(textarea.value).toContain("[A - AVALIAÇÃO]");
    expect(textarea.value).toContain("[P - PLANO]");
  });

  it("injects DAP template when template button is clicked", async () => {
    const user = userEvent.setup();
    render(<NarrativeEditor patientId="p-123" />);

    const dapBtn = screen.getByRole("button", { name: /Template DAP/i });
    await user.click(dapBtn);

    const textarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i }) as HTMLTextAreaElement;
    expect(textarea.value).toContain("[D - DADOS]");
    expect(textarea.value).toContain("[A - AVALIAÇÃO]");
    expect(textarea.value).toContain("[P - PLANO]");
  });

  it("does not persist clinical text in localStorage", async () => {
    render(<NarrativeEditor patientId="patient-xyz" />);

    const textarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i });
    fireEvent.change(textarea, {
      target: { value: "Nota clínica detalhada para verificação do autosave em tempo real." },
    });

    expect(localStorage.getItem("draft_narrative_patient-xyz")).toBeNull();
  });

  it("submits the form and calls onRequestAnalysis with content", async () => {
    const onAnalysis = vi.fn();
    const user = userEvent.setup();
    render(<NarrativeEditor patientId="p-456" onRequestAnalysis={onAnalysis} />);

    const textarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i });
    await user.clear(textarea);
    await user.type(
      textarea,
      "Paciente demonstra evolução significativa na regulação emocional e redução de sintomas ansiosos.",
    );

    const submitBtn = screen.getByRole("button", { name: /Solicitar análise assistiva/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onAnalysis).toHaveBeenCalledWith(
        expect.stringContaining("Paciente demonstra evolução significativa"),
      );
    });
  });

  it("supports keyboard submission via Ctrl+Enter shortcut", async () => {
    const onAnalysis = vi.fn();
    render(<NarrativeEditor patientId="p-789" onRequestAnalysis={onAnalysis} />);

    const textarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i });
    fireEvent.change(textarea, {
      target: { value: "Nota clínica extensa para teste do atalho ergonômico motor de envio rápido." },
    });

    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    await waitFor(() => {
      expect(onAnalysis).toHaveBeenCalled();
    });
  });

  it("does not write clinical text on beforeunload", () => {
    render(<NarrativeEditor patientId="p-flush" />);

    const textarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i });
    fireEvent.change(textarea, {
      target: { value: "Nota clínica para teste de flush imediato no beforeunload antes de 600ms." },
    });

    // Antes dos 600ms do debounce passarem, simula o evento beforeunload da janela
    window.dispatchEvent(new Event("beforeunload"));

    expect(localStorage.getItem("draft_narrative_p-flush")).toBeNull();
  });
});
