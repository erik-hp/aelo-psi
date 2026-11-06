import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppRoutes } from "@/routes/AppRoutes";
import { ToastProvider } from "@/contexts/ToastContext";
import { AuditTable, getEventCategory } from "@/components/audit/AuditTable";
import { clinicalService } from "@/services/clinicalService";
import type { AuditEvent } from "@/types/clinical";

// Mock auth hook
const mockUser = { id: "u-test-1", name: "Dra. Marina Costa", role: "ADMIN" };
let mockIsAuthenticated = true;

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    isLoading: false,
    can: () => true,
    permissions: ["dashboard:read", "sessions:read", "patients:read", "finance:read", "audit:read", "users:manage", "settings:manage"],
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: () => true,
    userRole: "ADMIN",
    rolePermissions: [],
  }),
}));

vi.mock("@/services/clinicalService", () => ({
  clinicalService: {
    getAgenda: vi.fn(),
    getAuditEvents: vi.fn(),
    getDashboard: vi.fn(),
    getFinance: vi.fn(),
    getPatients: vi.fn(),
    requestAnalysis: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderWithProviders(ui: React.ReactElement, initialRoute = "/") {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          {ui}
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("Empirical Challenge: Mobile Drawer & AppLayout Responsiveness", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockIsAuthenticated = true;
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([]);
  });

  it("renders mobile drawer closed by default, and toggles open/closed via Header menu and backdrop", async () => {
    renderWithProviders(<AppLayout />);

    // Initial state: Sidebar should have -translate-x-full (hidden on mobile, visible on desktop via lg:translate-x-0)
    const aside = screen.getByRole("complementary");
    expect(aside.getAttribute("data-state")).toBe("closed");
    expect(aside.className).toContain("lg:flex");

    // Backdrop should not be present initially
    expect(screen.queryByLabelText("Fechar navegação móvel")).toBeNull();

    // Find and click the mobile open button in Header
    const openMenuBtn = screen.getByRole("button", { name: "Abrir navegação" });
    expect(openMenuBtn.className).toContain("lg:hidden");

    fireEvent.click(openMenuBtn);

    // After clicking open: aside should have translate-x-0 and backdrop should be mounted
    expect(aside.getAttribute("data-state")).toBe("open");
    const backdrop = screen.getByLabelText("Fechar navegação móvel");
    expect(backdrop).toBeDefined();
    expect(backdrop.className).toContain("bg-overlay");

    // Click backdrop to close
    fireEvent.click(backdrop);

    // Sidebar should transition back to closed
    expect(aside.getAttribute("data-state")).toBe("closed");
    expect(screen.queryByLabelText("Fechar navegação móvel")).toBeNull();
  });

  it("closes mobile drawer when pressing Escape on the backdrop", async () => {
    renderWithProviders(<AppLayout />);

    const openMenuBtn = screen.getByRole("button", { name: "Abrir navegação" });
    fireEvent.click(openMenuBtn);

    const backdrop = screen.getByLabelText("Fechar navegação móvel");
    expect(backdrop).toBeDefined();

    // Trigger keydown Escape on backdrop
    fireEvent.keyDown(backdrop, { key: "Escape" });

    // Backdrop should be dismissed
    expect(screen.queryByLabelText("Fechar navegação móvel")).toBeNull();
    const aside = screen.getByRole("complementary");
    expect(aside.getAttribute("data-state")).toBe("closed");
  });

  it("closes mobile drawer when clicking the close button inside Sidebar", async () => {
    renderWithProviders(<AppLayout />);

    const openMenuBtn = screen.getByRole("button", { name: "Abrir navegação" });
    fireEvent.click(openMenuBtn);

    const closeBtn = screen.getByRole("button", { name: "Fechar navegação" });
    expect(closeBtn.className).toContain("lg:hidden");

    fireEvent.click(closeBtn);

    expect(screen.queryByLabelText("Fechar navegação móvel")).toBeNull();
    const aside = screen.getByRole("complementary");
    expect(aside.getAttribute("data-state")).toBe("closed");
  });

  it("automatically closes mobile drawer when a NavLink is clicked", async () => {
    renderWithProviders(<AppLayout />);

    // Open drawer
    fireEvent.click(screen.getByRole("button", { name: "Abrir navegação" }));
    expect(screen.getByLabelText("Fechar navegação móvel")).toBeDefined();

    // Click on "Editor Clínico" navlink
    const editorLink = screen.getByRole("link", { name: /Editor Clínico/i });
    fireEvent.click(editorLink);

    // Drawer should auto-close
    expect(screen.queryByLabelText("Fechar navegação móvel")).toBeNull();
  });

  it("does not crash if callbacks (onClose / onOpenSidebar) are omitted", () => {
    // Standalone Header without onOpenSidebar
    const { unmount: unmountHeader } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    const menuBtn = screen.getByRole("button", { name: "Abrir navegação" });
    expect(() => fireEvent.click(menuBtn)).not.toThrow();
    unmountHeader();

    // Standalone Sidebar without onClose
    renderWithProviders(<Sidebar isOpen={true} />);
    const closeBtn = screen.getByRole("button", { name: "Fechar navegação" });
    expect(() => fireEvent.click(closeBtn)).not.toThrow();

    const backdrop = screen.getByLabelText("Fechar navegação móvel");
    expect(() => fireEvent.click(backdrop)).not.toThrow();
    expect(() => fireEvent.keyDown(backdrop, { key: "Escape" })).not.toThrow();
  });
});

describe("Empirical Challenge: Direct Route /editor and /notes Redirect", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockIsAuthenticated = true;
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([]);
    vi.mocked(clinicalService.getDashboard).mockResolvedValue({
      patients: [],
      sessions: [],
      analyses: [],
      longitudinalData: [],
      auditEvents: [],
    });
  });

  it("directly renders NarrativeEditorPage when navigating to /editor", async () => {
    renderWithProviders(<AppRoutes />, "/editor");

    // Must display NarrativeEditorPage directly
    expect(await screen.findByText("Editor Narrativo de Prontuário")).toBeDefined();
    expect(screen.getByRole("textbox", { name: /Nota narrativa da sessão/i })).toBeDefined();
    expect(screen.getByLabelText(/Título da nota clínica/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Template SOAP/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Template DAP/i })).toBeDefined();
  });

  it("redirects /notes directly to /editor", async () => {
    renderWithProviders(<AppRoutes />, "/notes");

    expect(await screen.findByText("Editor Narrativo de Prontuário")).toBeDefined();
    expect(screen.getByRole("textbox", { name: /Nota narrativa da sessão/i })).toBeDefined();
  });

  it("redirects unauthenticated users trying to access /editor to /login", async () => {
    mockIsAuthenticated = false;

    renderWithProviders(<AppRoutes />, "/editor");

    expect(await screen.findByText(/Acesso profissional/i)).toBeDefined();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDefined();
    expect(screen.queryByText("Editor Narrativo de Prontuário")).toBeNull();
  });
});

describe("Empirical Challenge: Audit Table Severity Badges & Semantic Categorization", () => {
  it("strictly maps all event categories and keywords to corresponding badge variants", () => {
    // 1. Critical LGPD / Security
    const criticalCases: AuditEvent[] = [
      { id: "c1", actor: "Admin", role: "ADMIN", action: "Tentativa não autorizada", entity: "Cofre", date: "2026-05-28", ip: "1.1.1.1", category: "SECURITY_ALERT" },
      { id: "c2", actor: "WAF", role: "ADMIN", action: "Conexão bloqueada", entity: "API", date: "2026-05-28", ip: "1.1.1.1" },
      { id: "c3", actor: "Auditor", role: "ADMIN", action: "Violação do Art. 11 LGPD", entity: "Prontuário", date: "2026-05-28", ip: "1.1.1.1" },
      { id: "c4", actor: "Auditor", role: "ADMIN", action: "Alerta de segurança crítico", entity: "Vault", date: "2026-05-28", ip: "1.1.1.1" },
    ];
    for (const ev of criticalCases) {
      const res = getEventCategory(ev);
      expect(res.variant).toBe("critical");
      expect(res.label).toBe("Segurança / LGPD Art. 11");
    }

    // 2. Success Digital Signature / Cryptography
    const successCases: AuditEvent[] = [
      { id: "s1", actor: "Dra. Marina", role: "PSYCHOLOGIST", action: "Homologou checkpoint", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1", category: "DIGITAL_SIGNATURE" },
      { id: "s2", actor: "Dr. Rafael", role: "PSYCHOLOGIST", action: "Assinatura digital de checkpoint", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1" },
      { id: "s3", actor: "Dr. Rafael", role: "PSYCHOLOGIST", action: "Validação com chave P-256", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1" },
      { id: "s4", actor: "Dr. Rafael", role: "PSYCHOLOGIST", action: "Chave criptográfica aplicada", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1" },
      { id: "s5", actor: "Dra. Marina", role: "PSYCHOLOGIST", action: "Validou prontuário clínico", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1" },
    ];
    for (const ev of successCases) {
      const res = getEventCategory(ev);
      expect(res.variant).toBe("success");
      expect(res.label).toBe("Assinatura P-256 / SHA-256");
    }

    // 3. Warning Update / Addendum
    const warningCases: AuditEvent[] = [
      { id: "w1", actor: "Dr. Rafael", role: "PSYCHOLOGIST", action: "Alteração de registro", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1", category: "UPDATE" },
      { id: "w2", actor: "Dra. Marina", role: "PSYCHOLOGIST", action: "Atualizou conduta", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1" },
      { id: "w3", actor: "Dra. Marina", role: "PSYCHOLOGIST", action: "Registrou aditamento clínico", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1" },
    ];
    for (const ev of warningCases) {
      const res = getEventCategory(ev);
      expect(res.variant).toBe("warning");
      expect(res.label).toBe("Aditamento / Alteração");
    }

    // 4. Muted Record View
    const mutedCases: AuditEvent[] = [
      { id: "m1", actor: "Dra. Marina", role: "PSYCHOLOGIST", action: "Acesso de rotina", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1", category: "RECORD_VIEW" },
      { id: "m2", actor: "Dr. Rafael", role: "PSYCHOLOGIST", action: "Visualizou prontuário", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1" },
      { id: "m3", actor: "Dra. Marina", role: "PSYCHOLOGIST", action: "Consulta simples de histórico", entity: "Sessão", date: "2026-05-28", ip: "1.1.1.1" },
    ];
    for (const ev of mutedCases) {
      const res = getEventCategory(ev);
      expect(res.variant).toBe("muted");
      expect(res.label).toBe("Consulta de Prontuário");
    }

    // 5. Default Fallback
    const defaultCases: AuditEvent[] = [
      { id: "d1", actor: "Admin", role: "ADMIN", action: "Logout do sistema", entity: "Sessão Web", date: "2026-05-28", ip: "1.1.1.1" },
      { id: "d2", actor: "Interno", role: "INTERN", action: "Download de relatório geral", entity: "Relatório", date: "2026-05-28", ip: "1.1.1.1" },
    ];
    for (const ev of defaultCases) {
      const res = getEventCategory(ev);
      expect(res.variant).toBe("default");
      expect(res.label).toBe("Evento de Auditoria");
    }
  });

  it("preserves distinct semantic status tokens for critical, success, warning, and muted", () => {
    const events: AuditEvent[] = [
      {
        id: "evt-critical",
        actor: "WAF Monitor",
        role: "ADMIN",
        action: "Alerta de segurança: exportação bloqueada",
        entity: "Cofre",
        date: "2026-05-28 10:00",
        ip: "10.0.0.1",
        category: "SECURITY_ALERT",
      },
      {
        id: "evt-success",
        actor: "Dra. Marina",
        role: "PSYCHOLOGIST",
        action: "Assinatura digital P-256",
        entity: "Sessão 10",
        date: "2026-05-28 11:00",
        ip: "10.0.0.2",
        category: "DIGITAL_SIGNATURE",
      },
      {
        id: "evt-warning",
        actor: "Dr. Rafael",
        role: "PSYCHOLOGIST",
        action: "Atualizou nota clínica",
        entity: "Sessão 11",
        date: "2026-05-28 12:00",
        ip: "10.0.0.3",
        category: "UPDATE",
      },
      {
        id: "evt-muted",
        actor: "Dr. Rafael",
        role: "INTERN",
        action: "Visualizou histórico",
        entity: "Sessão 12",
        date: "2026-05-28 13:00",
        ip: "10.0.0.4",
        category: "RECORD_VIEW",
      },
      {
        id: "evt-default",
        actor: "Sistema",
        role: "ADMIN",
        action: "Rotina de backup executada",
        entity: "Banco",
        date: "2026-05-28 14:00",
        ip: "10.0.0.5",
      },
    ];

    render(<AuditTable events={events} />);

    // Verify Critical Badge styling
    const criticalBadge = screen.getByText("Segurança / LGPD Art. 11");
    expect(criticalBadge.className).toContain("text-status-rose-text");
    expect(criticalBadge.className).toContain("bg-status-rose-background");

    // Verify Success Badge styling
    const successBadge = screen.getByText("Assinatura P-256 / SHA-256");
    expect(successBadge.className).toContain("text-status-lime-text");
    expect(successBadge.className).toContain("bg-status-lime-background");

    // Verify Warning Badge styling
    const warningBadge = screen.getByText("Aditamento / Alteração");
    expect(warningBadge.className).toContain("text-status-yellow-text");
    expect(warningBadge.className).toContain("bg-status-yellow-background");

    // Verify Muted Badge styling
    const mutedBadge = screen.getByText("Consulta de Prontuário");
    expect(mutedBadge.className).toContain("text-text-secondary");
    expect(mutedBadge.className).toContain("bg-background-secondary-default");

    // Verify Default Badge styling
    const defaultBadge = screen.getByText("Evento de Auditoria");
    expect(defaultBadge.className).toContain("text-status-cyan-text");
    expect(defaultBadge.className).toContain("bg-status-cyan-background");

    // Verify Role Badges
    const adminRoleBadge = screen.getAllByText("ADMIN")[0];
    expect(adminRoleBadge.className).toContain("text-status-cyan-text"); // default variant

    const psychRoleBadge = screen.getAllByText("PSYCHOLOGIST")[0];
    expect(psychRoleBadge.className).toContain("text-status-lime-text"); // success variant

    const internRoleBadge = screen.getByText("INTERN");
    expect(internRoleBadge.className).toContain("text-text-secondary"); // muted variant
  });

  it("handles empty strings and missing properties in audit events safely", () => {
    const rawEvent: AuditEvent = {
      id: "err-1",
      actor: "",
      role: "" as AuditEvent["role"],
      action: "",
      entity: "",
      date: "",
      ip: "",
    };

    expect(() => getEventCategory(rawEvent)).not.toThrow();
    const result = getEventCategory(rawEvent);
    expect(result.variant).toBe("default");
    expect(result.label).toBe("Evento de Auditoria");
  });
});

describe("Empirical Challenge: Zeigarnik Counters & Edge Cases in Sidebar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders 0 pending count cleanly without rendering the Zeigarnik alert box or counter badge", async () => {
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([
      {
        id: "s-1",
        patientId: "p-1",
        patientName: "Paciente 1",
        date: "2026-05-28",
        time: "10:00",
        status: "completed",
        complement: "Concluído",
        attentionIndex: null,
      },
      {
        id: "s-2",
        patientId: "p-2",
        patientName: "Paciente 2",
        date: "2026-05-28",
        time: "11:00",
        status: "draft",
        complement: "Aguardando",
        attentionIndex: 50,
      },
    ]);

    renderWithProviders(<Sidebar />);

    // Wait for query to resolve
    await waitFor(() => {
      expect(screen.queryByText(/Pendências de Evolução/i)).toBeNull();
    });
    expect(screen.queryByText(/prontuário aguarda evolução/i)).toBeNull();
  });

  it("renders singular grammatical form when exactly 1 review is pending", async () => {
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([
      {
        id: "s-1",
        patientId: "p-1",
        patientName: "Paciente Único",
        date: "2026-05-28",
        time: "10:00",
        status: "needs_review",
        complement: "Pendente",
        attentionIndex: 75,
      },
    ]);

    renderWithProviders(<Sidebar />);

    expect(await screen.findByText(/Pendências de Evolução/i)).toBeDefined();
    expect(screen.getByText("1 prontuário aguarda evolução para fechamento ético do dia.")).toBeDefined();
  });

  it("renders plural grammatical form and aggregate badge count when multiple reviews or high attention index items are pending", async () => {
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([
      { id: "s-1", patientId: "p-1", patientName: "P1", date: "2026-05-28", time: "09:00", status: "needs_review", complement: "", attentionIndex: null },
      { id: "s-2", patientId: "p-2", patientName: "P2", date: "2026-05-28", time: "10:00", status: "needs_review", complement: "", attentionIndex: 40 },
      { id: "s-3", patientId: "p-3", patientName: "P3", date: "2026-05-28", time: "11:00", status: "draft", complement: "", attentionIndex: 90 }, // AttentionIndex >= 80
      { id: "s-4", patientId: "p-4", patientName: "P4", date: "2026-05-28", time: "14:00", status: "completed", complement: "", attentionIndex: 85 }, // AttentionIndex >= 80
    ]);

    renderWithProviders(<Sidebar />);

    expect(await screen.findByText(/Pendências de Evolução/i)).toBeDefined();
    expect(screen.getByText("4 prontuários aguardam evolução para fechamento ético do dia.")).toBeDefined();

    // The counter badges (one on the Agenda NavLink and one in the footer widget) should both show "4"
    const badges = screen.getAllByText("4");
    expect(badges.length).toBe(2);
  });

  it("handles API errors gracefully without crashing the navigation sidebar", async () => {
    vi.mocked(clinicalService.getAgenda).mockRejectedValue(new Error("Network / Server 500"));

    renderWithProviders(<Sidebar />);

    // Sidebar should still render navigation items
    expect(screen.getByText(/Atendimento Clínico/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Dashboard/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Agenda/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Editor Clínico/i })).toBeDefined();
    expect(screen.queryByText(/Pendências de Evolução/i)).toBeNull();
  });
});
