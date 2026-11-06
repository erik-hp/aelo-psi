import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  const today = new Date().toISOString().slice(0, 10);

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
        attentionIndex: null,
      },
      {
        id: "s-2",
        patientId: "p-2",
        patientName: "Lucas Andrade",
        date: today,
        time: "10:30",
        status: "in_progress",
        complement: "Sessão em andamento",
        attentionIndex: null,
      },
      {
        id: "s-3",
        patientId: "p-3",
        patientName: "Beatriz Fernandes",
        date: today,
        time: "14:00",
        status: "needs_review",
        complement: "Sessão realizada, aguardando notas",
        attentionIndex: 82,
      },
    ]);
  });

  it("renders chronological daily timeline view as default and supports toggling to monthly matrix (Hick Law)", async () => {
    renderAgendaPage();

    expect(await screen.findByRole("button", { name: /Linha do Tempo Diária/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Matriz Mensal/i })).toBeDefined();

    // Visualização da linha do tempo diária presente por padrão
    expect(await screen.findByText("Ana Clara Silva")).toBeDefined();
    expect(screen.getByText("09:00")).toBeDefined();

    // Alternar para a matriz mensal completa de planejamento
    const matrixBtn = screen.getByRole("button", { name: /Matriz Mensal/i });
    fireEvent.click(matrixBtn);

    expect(await screen.findByText(/Clique em um dia para selecionar e inspecionar/i)).toBeDefined();
    expect(screen.getByText("Dom")).toBeDefined();
    expect(screen.getByText("Seg")).toBeDefined();
  });

  it("models full clinical lifecycle and transitions session status (waiting -> in_progress -> needs_review -> completed)", async () => {
    renderAgendaPage();

    // Ana Clara Silva está com status 'draft' ("Aguardando")
    expect(await screen.findByText("Ana Clara Silva")).toBeDefined();
    const startBtn = screen.getByRole("button", { name: /Iniciar Consulta/i });
    expect(startBtn).toBeDefined();

    // Terapeuta inicia a consulta
    fireEvent.click(startBtn);

    // Agora o botão de encerramento e evolução deve estar disponível
    const evolveButtons = await screen.findAllByRole("button", { name: /Encerrar & Evoluir Nota/i });
    expect(evolveButtons.length).toBeGreaterThan(0);

    // Sessão de Beatriz Fernandes tem status 'needs_review' ("Evolução pendente")
    const signBtn = screen.getByRole("button", { name: /Assinar & Finalizar/i });
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

    expect(screen.getByRole("heading", { name: /Agendar Nova Sessão Clínica/i })).toBeDefined();

    const nameInput = screen.getByLabelText(/Nome do Paciente/i);
    await user.type(nameInput, "Mariana Vasconcelos");

    const submitBtn = screen.getByRole("button", { name: /Confirmar Agendamento/i });
    await user.click(submitBtn);

    // Modal fecha e notificação de sucesso é disparada
    expect(await screen.findByText(/Sessão agendada com sucesso/i)).toBeDefined();
    expect(await screen.findByText("Mariana Vasconcelos")).toBeDefined();
  });
});
