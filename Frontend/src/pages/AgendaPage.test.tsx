import { localDateKey } from "@/lib/dates";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AgendaPage } from "./AgendaPage";
import { ToastProvider } from "@/contexts/ToastContext";
import { clinicalService } from "@/services/clinicalService";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "synthetic-professional", role: "PSYCHOLOGIST" } }) }));

vi.mock("@/services/clinicalService", () => ({
  clinicalService: {
    getAgenda: vi.fn(),
    getPatients: vi.fn().mockResolvedValue([]),
  },
}));

function renderAgendaPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <AgendaPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("AgendaPage Dual View, Clinical Lifecycle, and New Session Modal", () => {
  const today = localDateKey();

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.mocked(clinicalService.getAgenda).mockResolvedValue([
      {
        id: "s-1",
        patientId: "p-1",
        patientName: "Ana Clara Silva",
        date: today,
        time: "09:00",
        status: "draft",
        complement: "Primeira consulta de acolhimento",
      },
      {
        id: "s-2",
        patientId: "p-2",
        patientName: "Lucas Andrade",
        date: today,
        time: "10:30",
        status: "in_progress",
        complement: "Sessão em andamento",
      },
      {
        id: "s-3",
        patientId: "p-3",
        patientName: "Beatriz Fernandes",
        date: today,
        time: "14:00",
        status: "needs_review",
        complement: "Sessão realizada, aguardando notas",
      },
    ]);
  });

  it("renders chronological daily timeline view as default and supports toggling to monthly matrix (Hick Law)", async () => {
    renderAgendaPage();

    expect(await screen.findByRole("button", { name: /Linha do tempo diária/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Matriz mensal/i })).toBeDefined();

    // Visualização da linha do tempo diária presente por padrão
    expect(await screen.findByText("Ana Clara Silva")).toBeDefined();
    expect(screen.getByText("09:00")).toBeDefined();

    // Alternar para a matriz mensal completa de planejamento
    const matrixBtn = screen.getByRole("button", { name: /Matriz mensal/i });
    fireEvent.click(matrixBtn);

    expect(await screen.findByText(/Clique em um dia para selecionar e inspecionar/i)).toBeDefined();
    expect(screen.getByText("Dom")).toBeDefined();
    expect(screen.getByText("Seg")).toBeDefined();
  });

  it("lists only documentary reviews chronologically, without ranking legacy scores", async () => {
    const base = { date: today, complement: "Registro sintético", status: "needs_review" as const };
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([
      { ...base, id: "later", patientId: "later", patientName: "Revisão posterior", time: "14:00", ...{ attentionIndex: 99 } },
      { ...base, id: "earlier", patientId: "earlier", patientName: "Revisão anterior", time: "08:00", ...{ attentionIndex: null } },
      { ...base, id: "scheduled", patientId: "scheduled", patientName: "Somente agendada", time: "07:00", status: "draft", ...{ attentionIndex: 100 } },
    ]);
    renderAgendaPage();
    const aside = await screen.findByRole("complementary");
    expect(await within(aside).findByText("Revisão anterior")).toBeDefined();
    expect(within(aside).queryByText("Somente agendada")).toBeNull();
    const links = within(aside).getAllByRole("link").filter((link) => link.textContent?.startsWith("Revisão"));
    expect(links.map((link) => link.textContent)).toEqual(["Revisão anterior", "Revisão posterior"]);
    expect(screen.queryByText(/Índice 99|Atenção 99|Prioridade 1/i)).toBeNull();
  });

  it.each([401, 403, 500])("keeps documentary reviews unavailable on HTTP %s", async (status) => {
    vi.mocked(clinicalService.getAgenda).mockRejectedValue(new Error(`HTTP ${status}`));
    renderAgendaPage();
    expect(await screen.findByText("Não foi possível carregar as revisões documentais.")).toBeDefined();
    expect(screen.queryByText("Nenhuma revisão documental pendente no período.")).toBeNull();
  });

  it("models full clinical lifecycle and transitions session status (waiting -> in_progress -> needs_review -> completed)", async () => {
    renderAgendaPage();

    // Ana Clara Silva está com status 'draft' ("Aguardando")
    expect(await screen.findByText("Ana Clara Silva")).toBeDefined();
    const startBtn = screen.getByRole("button", { name: /Iniciar consulta/i });
    expect(startBtn).toBeDefined();

    // Terapeuta inicia a consulta
    fireEvent.click(startBtn);

    // Agora o botão de encerramento e evolução deve estar disponível
    const evolveButtons = await screen.findAllByRole("button", { name: /Encerrar e evoluir nota/i });
    expect(evolveButtons.length).toBeGreaterThan(0);

    // Sessão de Beatriz Fernandes tem status 'needs_review' ("Evolução pendente")
    const signBtn = screen.getByRole("button", { name: /Assinar e finalizar/i });
    expect(signBtn).toBeDefined();

    fireEvent.click(signBtn);
    const toasts = await screen.findAllByText(/Status clínico atualizado/i);
    expect(toasts.length).toBeGreaterThan(0);
  });

  it("opens functional new session modal, submits scheduling form, and updates agenda", async () => {
    const user = userEvent.setup();
    renderAgendaPage();

    const newSessionBtn = await screen.findByRole("button", { name: /Nova sessão/i });
    await user.click(newSessionBtn);

    expect(screen.getByRole("heading", { name: /Agendar nova sessão clínica/i })).toBeDefined();

    const nameInput = screen.getByLabelText(/Nome do Paciente/i);
    await user.type(nameInput, "Mariana Vasconcelos");

    const submitBtn = screen.getByRole("button", { name: /Confirmar Agendamento/i });
    await user.click(submitBtn);

    // Modal fecha e notificação de sucesso é disparada
    expect(await screen.findByText(/Sessão agendada com sucesso/i)).toBeDefined();
    expect(await screen.findByText("Mariana Vasconcelos")).toBeDefined();
  });
});
