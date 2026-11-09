import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PatientProfilePage } from "./PatientProfilePage";
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

const mockPatientData = {
  patient: {
    id: "p-test-1",
    name: "Ana Beatriz Ramos",
    age: 32,
    status: "active" as const,
    treatmentDuration: "8 meses",
    sessionFrequency: "Semanal" as const,
    lastSession: "14/04/2026",
    nextSession: "21/04/2026",
    therapist: "Dra. Helena",
    tags: ["TCC", "Ansiedade"],
  },
  sessions: [
    {
      id: "sess-1",
      patientId: "p-test-1",
      title: "Sessão 14 - Reestruturação Cognitiva",
      date: "14/04/2026",
      summary: "Paciente relatou episódio de ansiedade desencadeado por sobrecarga de trabalho.",
      status: "completed" as const,
      duration: 50,
      narrative: "Relato detalhado da sessão de reestruturação cognitiva.",
    },
  ],
  analyses: [
    {
      id: "analysis-1",
      patientId: "p-test-1",
      sessionId: "sess-1",
      relevanceScore: 85,
      longitudinalEvolution: "Evolução positiva",
      narrativeCoherence: 90,
      moodScore: 70,
      emotionalStateScore: 65,
      psychologicalBurdenScore: 40,
      documentaryInconsistencies: ["Conferir o período relatado na sessão."],
      considerations: ["Melhora no autorregistro"],
      attentionPoints: ["Fadiga noturna"],
      patterns: ["Pensamento dicotômico"],
      sources: ["sess-1"],
      status: "validated" as const,
      createdAt: "2026-04-14T15:00:00Z",
    },
  ],
};

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={["/patients/p-test-1"]}>
            <Routes>
              <Route path="/patients/:patientId" element={<PatientProfilePage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("PatientProfilePage Clinical Tabs", () => {
  it("renders 4 accessible clinical tabs and allows navigating between them", async () => {
    vi.mocked(clinicalService.getPatient).mockResolvedValue(mockPatientData);
    vi.mocked(clinicalService.getPatientNotes).mockResolvedValue([]);
    vi.mocked(clinicalService.getPatientLongitudinal).mockResolvedValue([]);
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([]);
    vi.mocked(clinicalService.getPatientVault).mockResolvedValue({
      nodes: [],
      edges: [],
      communities: [],
      checkpoints: [],
    });

    renderWithClient();

    // Aguarda carregar dados do paciente
    await waitFor(() => {
      expect(screen.getByText("Ana Beatriz Ramos")).toBeDefined();
    });

    // 4 Abas Clínicas presentes no DOM (Leis de Miller e Jakob)
    const tabOverview = screen.getByRole("tab", { name: /Resumo clínico/i });
    const tabSessions = screen.getByRole("tab", { name: /Prontuários e sessões/i });
    const tabLongitudinal = screen.getByRole("tab", { name: /Evolução longitudinal/i });
    const tabVault = screen.getByRole("tab", { name: /Cofre Cognitivo \(Vault\)/i });

    expect(tabOverview).toBeDefined();
    expect(tabSessions).toBeDefined();
    expect(tabLongitudinal).toBeDefined();
    expect(tabVault).toBeDefined();

    // Inicialmente na aba "Resumo clínico"
    expect(screen.getByText("Tempo em tratamento")).toBeDefined();
    expect(screen.getByText("8 meses")).toBeDefined();
    expect(screen.getByText("Possíveis inconsistências documentais para revisão")).toBeDefined();
    expect(screen.getByText("Conferir o período relatado na sessão.")).toBeDefined();
    expect(screen.queryByText(/Risco clínico|Cenários de risco/i)).toBeNull();

    // Navega para aba "Prontuários e sessões"
    fireEvent.click(tabSessions);
    await waitFor(() => {
      expect(screen.getByText("Histórico de atendimentos e prontuários")).toBeDefined();
      expect(screen.getByText("Sessão 14 - Reestruturação Cognitiva")).toBeDefined();
    });

    // Botão de expandir editor de análise colapsável
    const toggleBtn = screen.getByRole("button", { name: /Analisar sessão com IA/i });
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Ocultar editor de análise/i)).toBeDefined();

    // Navega para aba "Evolução longitudinal"
    fireEvent.click(tabLongitudinal);
    await waitFor(() => {
      expect(screen.getByText("Métricas e Evolução longitudinal")).toBeDefined();
      expect(screen.getByText("Indicador de humor")).toBeDefined();
      expect(screen.getByText("Estado emocional")).toBeDefined();
    });

    // Navega para aba "Cofre cognitivo (Vault)"
    fireEvent.click(tabVault);
    await waitFor(() => {
      expect(screen.getAllByText(/Cofre Cognitivo/i).length).toBeGreaterThan(1);
    });
  });

  it("manages activeTab in controlled mode and supports tab transitions", async () => {
    vi.mocked(clinicalService.getPatient).mockResolvedValue(mockPatientData);
    vi.mocked(clinicalService.getPatientNotes).mockResolvedValue([]);
    vi.mocked(clinicalService.getPatientLongitudinal).mockResolvedValue([]);
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([]);
    vi.mocked(clinicalService.getPatientVault).mockResolvedValue({
      nodes: [],
      edges: [],
      communities: [],
      checkpoints: [],
    });

    renderWithClient();

    await waitFor(() => {
      expect(screen.getByText("Ana Beatriz Ramos")).toBeDefined();
    });

    const tabOverview = screen.getByRole("tab", { name: /Resumo clínico/i });
    const tabVault = screen.getByRole("tab", { name: /Cofre Cognitivo \(Vault\)/i });
    const tabSessions = screen.getByRole("tab", { name: /Prontuários e sessões/i });

    expect(tabOverview.getAttribute("aria-selected")).toBe("true");

    fireEvent.click(tabVault);
    expect(tabVault.getAttribute("aria-selected")).toBe("true");
    expect(tabOverview.getAttribute("aria-selected")).toBe("false");

    fireEvent.click(tabSessions);
    expect(tabSessions.getAttribute("aria-selected")).toBe("true");
    expect(tabVault.getAttribute("aria-selected")).toBe("false");
  });
});
