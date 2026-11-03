import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuditPage } from "./AuditPage";
import { clinicalService } from "@/services/clinicalService";

vi.mock("@/services/clinicalService", () => ({
  clinicalService: {
    getAuditEvents: vi.fn(),
  },
}));

function renderAuditPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuditPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AuditPage & AuditTable Cryptographic Traceability and Semantic Categorization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.mocked(clinicalService.getAuditEvents).mockResolvedValue([
      {
        id: "log-1",
        actor: "Dra. Marina Costa",
        role: "ADMIN",
        action: "Assinatura digital de checkpoint clínico com chave P-256",
        entity: "Paciente p-1002 (Cofre Cognitivo)",
        date: "2026-05-28 15:32",
        ip: "192.168.0.24",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        category: "DIGITAL_SIGNATURE",
        payload: { checkpoint_id: "chk-9002", decision: "VALIDATED" },
      },
      {
        id: "log-2",
        actor: "Dr. Rafael Nunes",
        role: "PSYCHOLOGIST",
        action: "Atualizou nota clínica e aditamento",
        entity: "Sessão s-9001 (Prontuário)",
        date: "2026-05-28 14:08",
        ip: "192.168.0.18",
        sha256: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        category: "UPDATE",
        payload: { addendum: "Conduta com psiquiatra" },
      },
      {
        id: "log-3",
        actor: "Sistema / WAF de Segurança",
        role: "ADMIN",
        action: "Alerta de segurança: tentativa de exportação não autorizada (LGPD Art. 11/20)",
        entity: "Cofre de Dados Sensíveis de Saúde",
        date: "2026-05-28 09:45",
        ip: "200.189.112.50",
        sha256: "3f79bb7b435b05321651daefd374cd681b61935c13e0e206470f5c24e077d4fa",
        category: "SECURITY_ALERT",
        payload: { severity: "CRITICAL", blocked: true },
      },
    ]);
  });

  it("categorizes audit events with semantic badges (LGPD Art. 11 critical, P-256 signature success, update warning)", async () => {
    renderAuditPage();

    // Badge crítico de LGPD
    expect(await screen.findByText(/Segurança \/ LGPD Art. 11/i)).toBeDefined();

    // Badge de sucesso de assinatura criptográfica
    expect(screen.getByText(/Assinatura P-256 \/ SHA-256/i)).toBeDefined();

    // Badge de aviso de aditamento
    expect(screen.getByText(/Aditamento \/ Alteração/i)).toBeDefined();
  });

  it("filters events by profile including PSYCHOLOGIST (validating clinicalService role mapping)", async () => {
    const user = userEvent.setup();
    renderAuditPage();

    expect(await screen.findByText("Dr. Rafael Nunes")).toBeDefined();

    const roleSelect = screen.getByLabelText(/Filtrar por perfil/i);
    await user.selectOptions(roleSelect, "PSYCHOLOGIST");

    // Somente o psicólogo deve aparecer
    expect(screen.getByText("Dr. Rafael Nunes")).toBeDefined();
    expect(screen.queryByText("Dra. Marina Costa")).toBeNull();
  });

  it("opens technical inspection modal showing IP, SHA-256 hash, and JSON payload", async () => {
    const user = userEvent.setup();
    renderAuditPage();

    const inspectBtn = (await screen.findAllByRole("button", { name: /Inspecionar/i }))[0];
    await user.click(inspectBtn);

    // Modal de detalhes técnicos
    expect(screen.getByRole("heading", { name: /Inspeção Técnica de Auditoria Imutável/i })).toBeDefined();
    expect(screen.getByText(/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855/)).toBeDefined();
    expect(screen.getAllByText("192.168.0.24").length).toBeGreaterThan(0);

    // Fechar modal
    const closeBtn = screen.getByRole("button", { name: /Concluir Inspeção/i });
    await user.click(closeBtn);

    expect(screen.queryByRole("heading", { name: /Inspeção Técnica de Auditoria Imutável/i })).toBeNull();
  });
});
