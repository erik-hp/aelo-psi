import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NarrativeEditor } from "@/components/forms/NarrativeEditor";
import { VaultApprovalModal } from "@/components/patients/VaultApprovalModal";
import { PatientProfilePage } from "@/pages/PatientProfilePage";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { clinicalService } from "@/services/clinicalService";

vi.mock("@/services/clinicalService", () => ({
  clinicalService: {
    getPatient: vi.fn(),
    getPatientNotes: vi.fn(),
    getPatientLongitudinal: vi.fn(),
    getAgenda: vi.fn(),
    requestPatientAnalysis: vi.fn(),
    getPatientVault: vi.fn(),
  },
}));

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

describe("Adversarial Stress Test: NarrativeEditor", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("handles corrupted JSON in localStorage gracefully without crashing", () => {
    localStorage.setItem("draft_narrative_p-corrupt", "{this is corrupt json!@#$");
    render(<NarrativeEditor patientId="p-corrupt" />);

    const titleInput = screen.getByLabelText(/Título da nota clínica/i) as HTMLInputElement;
    expect(titleInput.value).toBe("Sessão de acompanhamento longitudinal");
    expect(screen.getByRole("button", { name: /Solicitar análise assistiva/i })).toBeDefined();
  });

  it("removes legacy draft in demo mode instead of exposing it", async () => {
    localStorage.setItem(
      "draft_narrative_p-saved",
      JSON.stringify({
        title: "Sessão 18 - Reavaliação Cognitiva",
        content: "Conteúdo do rascunho salvo previamente pelo terapeuta para este paciente.",
        timestamp: "2026-11-03T02:00:00Z",
      }),
    );

    render(<NarrativeEditor patientId="p-saved" />);

    const titleInput = screen.getByLabelText(/Título da nota clínica/i) as HTMLInputElement;
    const contentTextarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i }) as HTMLTextAreaElement;

    expect(titleInput.value).toBe("Sessão de acompanhamento longitudinal");
    expect(contentTextarea.value).not.toContain("Conteúdo do rascunho salvo");
    await waitFor(() => expect(localStorage.getItem("draft_narrative_p-saved")).toBeNull());
  });

  it("keeps new-patient text only in memory", async () => {
    render(<NarrativeEditor patientId={undefined} />);
    const textarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i });

    fireEvent.change(textarea, {
      target: { value: "Nota clínica de um paciente anônimo ou novo sem ID especificado." },
    });

    expect(localStorage.getItem("draft_narrative_new")).toBeNull();
  });

  it("clears an in-memory draft after confirmation", async () => {
    render(<NarrativeEditor patientId="p-clear" />);

    // Simula usuário clicando em 'Cancelar' no confirm
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const clearBtn = screen.getByRole("button", { name: /Limpar rascunho/i });
    fireEvent.click(clearBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(localStorage.getItem("draft_narrative_p-clear")).toBeNull();

    // Simula usuário clicando em 'OK' no confirm
    confirmSpy.mockReturnValue(true);
    fireEvent.click(clearBtn);

    const contentTextarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i }) as HTMLTextAreaElement;
    await waitFor(() => expect(contentTextarea.value).toBe(""));
  });

  it("strictly enforces min 30 chars for content and min 3 chars for title", async () => {
    render(<NarrativeEditor patientId="p-val" />);

    const titleInput = screen.getByLabelText(/Título da nota clínica/i);
    const contentTextarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i });
    const submitBtn = screen.getByRole("button", { name: /Solicitar análise assistiva/i }) as HTMLButtonElement;

    // Título inválido (<3 chars)
    fireEvent.change(titleInput, { target: { value: "AB" } });
    fireEvent.change(contentTextarea, { target: { value: "Nota clínica com mais de trinta caracteres válidos para teste." } });

    await waitFor(() => {
      expect(submitBtn.disabled).toBe(true);
      expect(screen.getByText(/Informe um título clínico/i)).toBeDefined();
    });

    // Título válido, mas conteúdo curto (<30 chars: 29 chars)
    fireEvent.change(titleInput, { target: { value: "Título Válido" } });
    fireEvent.change(contentTextarea, { target: { value: "12345678901234567890123456789" } });

    await waitFor(() => {
      expect(submitBtn.disabled).toBe(true);
      expect(screen.getByText(/mínimo 30 caracteres/i)).toBeDefined();
    });

    // Conteúdo com exatamente 30 caracteres
    fireEvent.change(contentTextarea, { target: { value: "123456789012345678901234567890" } });

    await waitFor(() => {
      expect(submitBtn.disabled).toBe(false);
      expect(screen.queryByText(/mínimo 30 caracteres/i)).toBeNull();
    });
  });

  it("prevents Ctrl+Enter or Cmd+Enter submission when form is invalid", async () => {
    const onSave = vi.fn();
    const onRequestAnalysis = vi.fn();

    render(
      <NarrativeEditor
        patientId="p-shortcut"
        onSave={onSave}
        onRequestAnalysis={onRequestAnalysis}
      />,
    );

    const titleInput = screen.getByLabelText(/Título da nota clínica/i);
    const contentTextarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i });

    // Preenche com conteúdo inválido (<30 chars)
    fireEvent.change(titleInput, { target: { value: "OK" } });
    fireEvent.change(contentTextarea, { target: { value: "Curto" } });

    // Pressiona Ctrl+Enter
    fireEvent.keyDown(contentTextarea, { key: "Enter", ctrlKey: true });
    // Pressiona Cmd+Enter (Mac)
    fireEvent.keyDown(contentTextarea, { key: "Enter", metaKey: true });

    // Não deve chamar onSave nem onRequestAnalysis
    expect(onSave).not.toHaveBeenCalled();
    expect(onRequestAnalysis).not.toHaveBeenCalled();
  });

  it("submits via Cmd+Enter (metaKey) when form is valid and clears localStorage", async () => {
    const onRequestAnalysis = vi.fn();

    render(
      <NarrativeEditor
        patientId="p-cmd-enter"
        onRequestAnalysis={onRequestAnalysis}
      />,
    );

    const titleInput = screen.getByLabelText(/Título da nota clínica/i);
    const contentTextarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i });

    fireEvent.change(titleInput, { target: { value: "Título Adequado" } });
    fireEvent.change(contentTextarea, {
      target: { value: "Paciente comparece à sessão relatando melhora substancial nas crises de pânico." },
    });

    // Pressiona Cmd+Enter
    fireEvent.keyDown(contentTextarea, { key: "Enter", metaKey: true });

    await waitFor(() => {
      expect(onRequestAnalysis).toHaveBeenCalledWith(
        expect.stringContaining("Paciente comparece à sessão"),
      );
      // Deve ter limpado o rascunho
      expect(localStorage.getItem("draft_narrative_p-cmd-enter")).toBeNull();
    });
  });

  it("updates character count and estimated reading time accurately", () => {
    render(<NarrativeEditor patientId="p-stats" />);
    const contentTextarea = screen.getByRole("textbox", { name: /Nota narrativa da sessão/i });

    // 10 palavras, 51 caracteres
    fireEvent.change(contentTextarea, {
      target: { value: "Uma duas três quatro cinco seis sete oito nove dez." },
    });

    expect(screen.getByText(/51 caracteres · 10 palavras/i)).toBeDefined();
    expect(screen.getByText(/~1 min de leitura/i)).toBeDefined();
  });
});

describe("Adversarial Stress Test: VaultApprovalModal Validation Invariants", () => {
  it("rejects justification with fewer than 10 characters", () => {
    const onConfirm = vi.fn();
    render(
      <VaultApprovalModal
        open={true}
        busy={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const button = screen.getByRole("button", { name: "Assinar aprovação" }) as HTMLButtonElement;
    const textarea = screen.getByRole("textbox", { name: "Justificativa clínica" });

    // 9 caracteres
    fireEvent.change(textarea, { target: { value: "123456789" } });
    expect(button.disabled).toBe(true);

    // 10 caracteres
    fireEvent.change(textarea, { target: { value: "1234567890" } });
    expect(button.disabled).toBe(false);
  });

  it("strictly trims whitespace and rejects strings with >= 10 whitespace chars", () => {
    const onConfirm = vi.fn();
    render(
      <VaultApprovalModal
        open={true}
        busy={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const button = screen.getByRole("button", { name: "Assinar aprovação" }) as HTMLButtonElement;
    const textarea = screen.getByRole("textbox", { name: "Justificativa clínica" });

    // 15 espaços em branco
    fireEvent.change(textarea, { target: { value: "               " } });
    expect(button.disabled).toBe(true);

    // 5 espaços + 5 letras + 5 espaços (trimmed length = 5 < 10)
    fireEvent.change(textarea, { target: { value: "     abcde     " } });
    expect(button.disabled).toBe(true);

    // 5 espaços + 10 letras + 5 espaços (trimmed length = 10 >= 10)
    fireEvent.change(textarea, { target: { value: "     abcdefghij     " } });
    expect(button.disabled).toBe(false);

    // Ao confirmar, envia a versão aparada (trimmed)
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledWith("abcdefghij");
  });

  it("locks action and disables buttons when busy is true", () => {
    render(
      <VaultApprovalModal
        open={true}
        busy={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Assinar aprovação" }) as HTMLButtonElement;
    const cancelBtn = screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement;
    const textarea = screen.getByRole("textbox", { name: "Justificativa clínica" });

    fireEvent.change(textarea, { target: { value: "Justificativa clínica longa e válida." } });
    expect(button.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(true);
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <VaultApprovalModal
        open={false}
        busy={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("activates approval with each of the quick justification chips", () => {
    const onConfirm = vi.fn();
    render(
      <VaultApprovalModal
        open={true}
        busy={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const button = screen.getByRole("button", { name: "Assinar aprovação" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    // Clica no primeiro chip
    const chip1 = screen.getByText(/Checkpoint revisado e compatível/i);
    fireEvent.click(chip1);

    expect(button.disabled).toBe(false);

    // Clica no segundo chip
    const chip2 = screen.getByText(/Hipóteses de IA conferidas/i);
    fireEvent.click(chip2);

    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledWith("Hipóteses de IA conferidas contra a nota original do prontuário.");
  });

  it("correctly renders SHA-256 and node/edge count invariants", () => {
    render(
      <VaultApprovalModal
        open={true}
        busy={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        hashSHA256="sha256:abc123def4567890fedcba"
        nodeCount={12}
        edgeCount={24}
      />,
    );

    expect(screen.getByText("sha256:abc123def4567890fedcba")).toBeDefined();
    expect(screen.getByText("12 nós conceituais")).toBeDefined();
    expect(screen.getByText("24 relações estruturadas")).toBeDefined();
  });
});

describe("Adversarial Stress Test: PatientProfilePage & SessionAnalysisBlock", () => {
  const mockPatientData = {
    patient: {
      id: "p-adv-1",
      name: "Carlos Eduardo Silva",
      age: 45,
      status: "active" as const,
      treatmentDuration: "1 ano",
      sessionFrequency: "Quinzenal" as const,
      lastSession: "01/05/2026",
      nextSession: "15/05/2026",
      riskLevel: "baixo" as const,
      therapist: "Dr. Roberto",
      tags: ["TCC"],
    },
    sessions: [
      {
        id: "sess-adv-1",
        patientId: "p-adv-1",
        title: "Sessão 20 - Conclusão de Metas",
        date: "01/05/2026",
        summary: "Resumo curto.",
        status: "completed" as const,
        duration: 50,
        narrative: "Narrativa completa da sessão com mais de trinta caracteres para verificação clínica.",
      },
    ],
    analyses: [],
  };

  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/patients/p-adv-1"]}>
              <Routes>
                <Route path="/patients/:patientId" element={<PatientProfilePage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
  }

  it("preserves accordion toggle state and strictly enforces 30 char minimum in SessionAnalysisBlock", async () => {
    vi.mocked(clinicalService.getPatient).mockResolvedValue(mockPatientData);
    vi.mocked(clinicalService.getPatientNotes).mockResolvedValue([]);
    vi.mocked(clinicalService.getPatientLongitudinal).mockResolvedValue([]);
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Carlos Eduardo Silva")).toBeDefined();
    });

    // Navega para aba Prontuários e Sessões
    fireEvent.click(screen.getByRole("tab", { name: /Prontuários e Sessões/i }));

    // Inicialmente o textarea do bloco de análise NÃO deve estar no DOM
    expect(screen.queryByLabelText(/Texto do prontuário para extração/i)).toBeNull();

    // Expande o bloco de análise
    const toggleBtn = screen.getByRole("button", { name: /Analisar sessão com IA/i });
    fireEvent.click(toggleBtn);

    const analysisTextarea = screen.getByLabelText(/Texto do prontuário para extração/i);
    expect(analysisTextarea).toBeDefined();

    const sendBtn = screen.getByRole("button", { name: /Enviar para análise/i }) as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(false);

    // Apaga o conteúdo até ficar com menos de 30 caracteres
    fireEvent.change(analysisTextarea, { target: { value: "Texto curto < 30" } });
    expect(sendBtn.disabled).toBe(true);

    // Digita texto com >= 30 caracteres
    fireEvent.change(analysisTextarea, {
      target: { value: "Texto clínico com tamanho suficiente para acionar a extração ontológica com segurança." },
    });
    expect(sendBtn.disabled).toBe(false);

    // Clica para enviar
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(clinicalService.requestPatientAnalysis).toHaveBeenCalledWith({
        patientId: "p-adv-1",
        sessionId: "sess-adv-1",
        content: "Texto clínico com tamanho suficiente para acionar a extração ontológica com segurança.",
      });
    });

    // Fecha o acordeão
    const hideBtn = screen.getByRole("button", { name: /Ocultar editor de análise/i });
    fireEvent.click(hideBtn);
    expect(screen.queryByLabelText(/Texto do prontuário para extração/i)).toBeNull();
  });
});
