import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { clinicalService } from "@/services/clinicalService";

vi.mock("@/services/clinicalService", () => ({
  clinicalService: {
    getDashboard: vi.fn(),
    getAgenda: vi.fn(),
    getFinance: vi.fn(),
  },
}));

function renderDashboardPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage Resiliency, Hero Card and Clinical Alerts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.mocked(clinicalService.getDashboard).mockResolvedValue({
      patients: [
        {
          id: "p-101",
          name: "Ana Clara Silva",
          age: 32,
          status: "active",
          treatmentDuration: "6 meses",
          sessionFrequency: "Semanal",
          lastSession: "2026-05-20",
          nextSession: "2026-05-28",
          riskLevel: "atenção",
          therapist: "Dra. Marina Costa",
          tags: ["Ansiedade"],
        },
      ],
      sessions: [],
      analyses: [],
      longitudinalData: [],
      auditEvents: [
        {
          id: "audit-1",
          actor: "Dra. Marina Costa",
          role: "ADMIN",
          action: "Validou análise assistiva",
          entity: "Paciente p-101",
          date: "2026-05-28 10:00",
          ip: "127.0.0.1",
        },
      ],
    });

    vi.mocked(clinicalService.getAgenda).mockResolvedValue([
      {
        id: "s-1",
        patientId: "p-101",
        patientName: "Ana Clara Silva",
        date: "2026-05-28",
        time: "14:00",
        status: "draft",
        complement: "Sessão focada em reestruturação cognitiva",
        attentionIndex: 85,
      },
      {
        id: "s-2",
        patientId: "p-102",
        patientName: "Marcos Vinicius",
        date: "2026-05-28",
        time: "15:30",
        status: "needs_review",
        complement: "Evolução pendente pós-consulta",
        attentionIndex: 40,
      },
    ]);

    vi.mocked(clinicalService.getFinance).mockResolvedValue([
      {
        id: "fin-1",
        psychologist: "Dra. Marina Costa",
        patientName: "Ana Clara Silva",
        date: "2026-05-28",
        sessionValue: 250,
        platformFee: 25,
        netValue: 225,
        status: "paid",
      },
    ]);
  });

  it("renders Hero Card for the next session with direct record access link (Fitts Law)", async () => {
    renderDashboardPage();

    // O cabeçalho Hero Card do próximo paciente renderiza em H2
    expect(await screen.findByRole("heading", { name: "Ana Clara Silva", level: 2 })).toBeDefined();
    expect(screen.getAllByText(/14:00/).length).toBeGreaterThan(0);

    const accessBtn = screen.getByRole("link", { name: /Acessar prontuário de Ana Clara Silva/i });
    expect(accessBtn).toBeDefined();
    expect(accessBtn.getAttribute("href")).toBe("/patients/p-101");
  });

  it("resiliently recovers when financeQuery fails and does NOT collapse the dashboard (Tesler Law)", async () => {
    vi.mocked(clinicalService.getFinance).mockRejectedValue(new Error("Database connection refused"));

    renderDashboardPage();

    // O dashboard NÃO deve quebrar nem exibir mensagem fatal
    expect(await screen.findByText("Dashboard Clínico")).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Ana Clara Silva", level: 2 })).toBeDefined();

    // Módulo financeiro exibe degradação graciosa em vez de quebrar a página
    expect(await screen.findByText(/Dados financeiros temporariamente indisponíveis/i)).toBeDefined();
  });

  it("segregates high-risk clinical alerts from normal administrative reviews (Von Restorff)", async () => {
    renderDashboardPage();

    expect(await screen.findByText(/Alertas Clínicos de Alto Risco/i)).toBeDefined();
    expect(await screen.findByText(/Índice 85/i)).toBeDefined();
    expect(screen.getByText(/Pendências de Evolução/i)).toBeDefined();
  });

  it("renders Zeigarnik open records section with actionable 'Evoluir' button", async () => {
    renderDashboardPage();

    const marcosList = await screen.findAllByText("Marcos Vinicius");
    expect(marcosList.length).toBeGreaterThan(0);

    const evoluirLinks = screen.getAllByRole("link", { name: /Evoluir/i });
    expect(evoluirLinks.length).toBeGreaterThan(0);
    expect(evoluirLinks[0].getAttribute("href")).toBe("/patients/p-102");
  });
});
