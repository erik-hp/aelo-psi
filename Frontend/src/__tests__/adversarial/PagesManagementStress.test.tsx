import { localDateKey } from "@/lib/dates";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "@/pages/DashboardPage";
import { AgendaPage } from "@/pages/AgendaPage";
import { AuditPage } from "@/pages/AuditPage";
import { AuditTable, getEventCategory } from "@/components/audit/AuditTable";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/contexts/ToastContext";
import { clinicalService } from "@/services/clinicalService";
import type { AuditEvent } from "@/types/clinical";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u-1", name: "Dra. Marina Costa", role: "ADMIN" },
    can: () => true,
    permissions: [],
    logout: vi.fn(),
  }),
}));

vi.mock("@/services/clinicalService", () => ({
  clinicalService: {
    getDashboard: vi.fn(),
    getAgenda: vi.fn(),
    getFinance: vi.fn(),
    getAuditEvents: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe("Adversarial Stress Test: DashboardPage Resilience & Query Failures", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.mocked(clinicalService.getDashboard).mockResolvedValue({
      patients: [
        {
          id: "p-1",
          name: "Paciente Alpha",
          age: 28,
          status: "active",
          treatmentDuration: "3 meses",
          sessionFrequency: "Semanal",
          lastSession: "2026-05-20",
          nextSession: "2026-05-28",
          riskLevel: "moderado",
          therapist: "Dra. Marina Costa",
          tags: ["TCC"],
        },
      ],
      sessions: [],
      analyses: [],
      longitudinalData: [],
      auditEvents: [
        {
          id: "ev-1",
          actor: "Dra. Marina Costa",
          role: "ADMIN",
          action: "Acessou prontuário",
          entity: "Paciente p-1",
          date: "2026-05-28 08:30",
          ip: "10.0.0.1",
        },
      ],
    });

    vi.mocked(clinicalService.getAgenda).mockResolvedValue([
      {
        id: "s-1",
        patientId: "p-1",
        patientName: "Paciente Alpha",
        date: "2026-05-28",
        time: "10:00",
        status: "draft",
        complement: "Acolhimento de rotina",
        attentionIndex: 85,
      },
      {
        id: "s-2",
        patientId: "p-2",
        patientName: "Paciente Beta",
        date: "2026-05-28",
        time: "11:00",
        status: "needs_review",
        complement: "Anotações pendentes",
        attentionIndex: 30,
      },
    ]);

    vi.mocked(clinicalService.getFinance).mockResolvedValue([
      {
        id: "f-1",
        psychologist: "Dra. Marina Costa",
        patientName: "Paciente Alpha",
        date: "2026-05-28",
        sessionValue: 200,
        platformFee: 20,
        netValue: 180,
        status: "paid",
      },
    ]);
  });

  it("handles isolated financeQuery failure without collapsing clinical dashboard", async () => {
    vi.mocked(clinicalService.getFinance).mockRejectedValue(new Error("503 Service Unavailable: Finance DB"));

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Screen must not crash
    expect(await screen.findByText("Dashboard Clínico")).toBeDefined();
    // Clinical sessions and Hero Card must remain visible and functional
    expect(await screen.findByRole("heading", { name: "Paciente Alpha", level: 2 })).toBeDefined();
    expect(screen.getAllByText(/10:00/).length).toBeGreaterThan(0);
    // Graceful financial fallback message
    expect(await screen.findByText(/Dados financeiros temporariamente indisponíveis/i)).toBeDefined();
  });

  it("handles isolated agendaQuery failure without collapsing clinical dashboard", async () => {
    vi.mocked(clinicalService.getAgenda).mockRejectedValue(new Error("500 Internal Server Error: Agenda Service"));

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Screen must not crash
    expect(await screen.findByText("Dashboard Clínico")).toBeDefined();
    // Agenda error alert is displayed gracefully in Hero slot
    expect(await screen.findByText(/Não foi possível sincronizar a agenda imediata/i)).toBeDefined();
    // Agenda section alert is displayed
    expect(await screen.findByText(/Não foi possível carregar as sessões da agenda/i)).toBeDefined();
    // Patient metrics still show
    expect(screen.getByText("Pacientes ativos")).toBeDefined();
  });

  it("handles simultaneous failure of financeQuery, agendaQuery, and dashboardQuery without fatal crash", async () => {
    vi.mocked(clinicalService.getDashboard).mockRejectedValue(new Error("Critical backend timeout"));
    vi.mocked(clinicalService.getAgenda).mockRejectedValue(new Error("Critical agenda timeout"));
    vi.mocked(clinicalService.getFinance).mockRejectedValue(new Error("Critical finance timeout"));

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Dashboard Clínico")).toBeDefined();
    expect(await screen.findByText(/Indicadores de pacientes temporariamente indisponíveis/i)).toBeDefined();
    expect(await screen.findByText(/Não foi possível sincronizar a agenda imediata/i)).toBeDefined();
    expect(await screen.findByText(/Dados financeiros temporariamente indisponíveis/i)).toBeDefined();
  });

  it("survives empty datasets and malformed agenda items with null attention index", async () => {
    vi.mocked(clinicalService.getDashboard).mockResolvedValue({
      patients: [],
      sessions: [],
      analyses: [],
      longitudinalData: [],
      auditEvents: [],
    });
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([
      {
        id: "s-corrupt",
        patientId: "p-corrupt",
        patientName: "Paciente Sem Dados",
        date: "2099-12-31",
        time: "23:59",
        status: "draft",
        complement: "",
        attentionIndex: null,
      },
    ]);
    vi.mocked(clinicalService.getFinance).mockResolvedValue([]);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Dashboard Clínico")).toBeDefined();
    const items = await screen.findAllByText("Paciente Sem Dados");
    expect(items.length).toBeGreaterThan(0);
    expect(screen.getByText(/Sem observações adicionais para este atendimento/i)).toBeDefined();
  });
});

describe("Adversarial Stress Test: AgendaPage Dual View, Transitions & Modal", () => {
  const today = localDateKey();

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.mocked(clinicalService.getAgenda).mockResolvedValue([
      {
        id: "s-10",
        patientId: "p-10",
        patientName: "Carlos Eduardo",
        date: today,
        time: "08:00",
        status: "draft",
        complement: "Consulta inicial de alinhamento",
        attentionIndex: null,
      },
      {
        id: "s-20",
        patientId: "p-20",
        patientName: "Diana Prince",
        date: today,
        time: "09:30",
        status: "needs_review",
        complement: "Aguardando notas clínicas",
        attentionIndex: 90,
      },
    ]);
  });

  it("stress tests view toggling: timeline to monthly matrix and back via date click", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <AgendaPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );

    // Initial state: timeline view
    expect(await screen.findByText("Carlos Eduardo")).toBeDefined();

    // Toggle to Monthly Matrix
    const matrixBtn = screen.getByRole("button", { name: /Matriz Mensal/i });
    fireEvent.click(matrixBtn);

    expect(await screen.findByText(/Clique em um dia para selecionar e inspecionar/i)).toBeDefined();

    // In matrix view, find the selected/today day button and click it to auto-switch back to timeline
    const allDayButtons = screen.getAllByRole("button", { name: /Selecionar dia/ });
    expect(allDayButtons.length).toBeGreaterThan(0);

    fireEvent.click(allDayButtons[0]);

    // Should return to timeline mode
    expect(await screen.findByRole("button", { name: /Linha do Tempo Diária/i })).toBeDefined();
  });

  it("executes full lifecycle transition: draft -> in_progress -> needs_review -> completed", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <AgendaPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );

    // 1. Initial draft status has "Iniciar Consulta" button
    expect(await screen.findByText("Carlos Eduardo")).toBeDefined();
    const startBtn = screen.getByRole("button", { name: /Iniciar Consulta/i });
    fireEvent.click(startBtn);

    // Toast feedback appears
    expect(await screen.findByText(/A sessão foi atualizada para "Em atendimento"/i)).toBeDefined();

    // 2. Now status is in_progress, button is "Encerrar & Evoluir Nota"
    const endBtn = await screen.findByRole("button", { name: /Encerrar & Evoluir Nota/i });
    fireEvent.click(endBtn);

    expect(await screen.findByText(/A sessão foi atualizada para "Evolução pendente"/i)).toBeDefined();

    // 3. Now status is needs_review, button is "Assinar & Finalizar"
    const signButtons = await screen.findAllByRole("button", { name: /Assinar & Finalizar/i });
    expect(signButtons.length).toBeGreaterThan(0);
    fireEvent.click(signButtons[0]);

    expect(await screen.findByText(/A sessão foi atualizada para "Finalizada e assinada"/i)).toBeDefined();
  });

  it("strictly validates patient name in new session modal, rejecting blank or whitespace submissions", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <AgendaPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );

    const newBtn = await screen.findByRole("button", { name: /Nova sessão/i });
    await user.click(newBtn);

    expect(screen.getByRole("heading", { name: /Agendar Nova Sessão Clínica/i })).toBeDefined();

    // Type spaces only
    const nameInput = screen.getByLabelText(/Nome do Paciente/i);
    await user.type(nameInput, "   ");

    const submitBtn = screen.getByRole("button", { name: /Confirmar Agendamento/i });
    await user.click(submitBtn);

    // Must show validation error toast
    expect(await screen.findByText(/Nome obrigatório/i)).toBeDefined();
    expect(screen.getByText(/Por favor, informe o nome do paciente para agendamento/i)).toBeDefined();

    // Type valid name and submit
    await user.clear(nameInput);
    await user.type(nameInput, "Helena Roitman");
    await user.click(submitBtn);

    // Modal closes and success message shows
    expect(await screen.findByText(/Sessão agendada com sucesso/i)).toBeDefined();
    expect(await screen.findByText("Helena Roitman")).toBeDefined();
  });

  it("filters agenda items by search term and status correctly, displaying EmptyState when no matches", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <AgendaPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Carlos Eduardo")).toBeDefined();

    const searchInput = screen.getByPlaceholderText(/Buscar paciente na agenda/i);
    await user.type(searchInput, "Inexistente XYZ");

    expect(await screen.findByText(/Nenhuma sessão para esta data/i)).toBeDefined();
  });
});

describe("Adversarial Stress Test: AuditTable & AuditPage Technical Inspection", () => {
  const mockEvents: AuditEvent[] = [
    {
      id: "ev-lgpd",
      actor: "Sistema WAF",
      role: "ADMIN",
      action: "Exportação não autorizada de dados de saúde mental (LGPD Art. 11)",
      entity: "Banco de Prontuários",
      date: "2026-05-28 12:00",
      ip: "189.40.22.1",
      category: "SECURITY_ALERT",
      sha256: "aabbcc1122334455",
      payload: { violation: "LGPD_ART_11", level: "HIGH" },
    },
    {
      id: "ev-sign",
      actor: "Dra. Marina Costa",
      role: "PSYCHOLOGIST",
      action: "Assinatura criptográfica P-256 de evolução clínica",
      entity: "Sessão s-101",
      date: "2026-05-28 12:30",
      ip: "10.1.1.5",
      category: "DIGITAL_SIGNATURE",
      sha256: "ffeedd6655443322",
      payload: { p256_verified: true },
    },
    {
      id: "ev-corrupt",
      actor: "Usuário Teste",
      role: "INTERN",
      action: "Consulta de rotina",
      entity: "Registro",
      date: "2026-05-28 13:00",
      ip: "127.0.0.1",
    },
  ];

  it("classifies audit events accurately across all edge-case action strings", () => {
    const variantFor = (action: string) => getEventCategory({
      id: "category-test", actor: "Teste", role: "ADMIN", action,
      entity: "X", date: "", ip: "",
    }).variant;
    expect(variantFor("Tentativa de acesso não autorizada")).toBe("critical");
    expect(variantFor("Alerta de segurança disparado")).toBe("critical");
    expect(variantFor("Violação da LGPD Art. 11 detectada")).toBe("critical");
    expect(variantFor("Assinatura digital P-256 realizada")).toBe("success");
    expect(variantFor("Validou checkpoint criptográfico")).toBe("success");
    expect(variantFor("Atualizou nota clínica")).toBe("warning");
    expect(variantFor("Aditamento realizado")).toBe("warning");
    expect(variantFor("Visualizou prontuário do paciente")).toBe("muted");
    expect(variantFor("Ação genérica desconhecida")).toBe("default");
  });

  it("handles missing SHA-256 hash and null payload safely in inspection modal without crashing", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuditTable events={mockEvents} />
      </MemoryRouter>,
    );

    // Click inspect on the corrupt event (third one)
    const inspectButtons = screen.getAllByRole("button", { name: /Inspecionar evento/i });
    expect(inspectButtons.length).toBe(3);

    await user.click(inspectButtons[2]);

    // Modal must be open
    expect(screen.getByRole("heading", { name: /Inspeção Técnica de Auditoria Imutável/i })).toBeDefined();

    // A missing hash must never be represented as a verified value.
    expect(screen.getByText(/Hash não informado pelo servidor/)).toBeDefined();

    // Default structured payload should be formatted without a fabricated verification state.
    expect(screen.getByText(/event_id/)).toBeDefined();
    expect(screen.queryByText(/PASSED_CRYPTOGRAPHIC_VERIFICATION/)).toBeNull();

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Concluir Inspeção/i });
    await user.click(closeBtn);

    expect(screen.queryByRole("heading", { name: /Inspeção Técnica de Auditoria Imutável/i })).toBeNull();
  });

  it("filters events by role in AuditPage including PSYCHOLOGIST, INTERN and ADMIN", async () => {
    vi.mocked(clinicalService.getAuditEvents).mockResolvedValue(mockEvents);

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuditPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Dra. Marina Costa")).toBeDefined();
    expect(screen.getByText("Sistema WAF")).toBeDefined();

    // Select PSYCHOLOGIST
    const roleSelect = screen.getByLabelText(/Filtrar por perfil/i);
    await user.selectOptions(roleSelect, "PSYCHOLOGIST");

    expect(screen.getByText("Dra. Marina Costa")).toBeDefined();
    expect(screen.queryByText("Sistema WAF")).toBeNull();

    // Select INTERN
    await user.selectOptions(roleSelect, "INTERN");
    expect(screen.getByText("Usuário Teste")).toBeDefined();
    expect(screen.queryByText("Dra. Marina Costa")).toBeNull();
  });
});

describe("Adversarial Stress Test: Navigation & Layout Drawer", () => {
  it("renders mobile drawer open and closed states with backdrop dismiss", () => {
    const handleClose = vi.fn();
    const queryClient = createTestQueryClient();

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Sidebar isOpen={false} onClose={handleClose} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // When closed, backdrop is not in the DOM
    expect(screen.queryByLabelText("Fechar navegação móvel")).toBeNull();

    // When opened
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Sidebar isOpen={true} onClose={handleClose} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const backdrop = screen.getByLabelText("Fechar navegação móvel");
    expect(backdrop).toBeDefined();

    // Click backdrop to close
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Test Esc key on backdrop
    fireEvent.keyDown(backdrop, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
