import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { clinicalService } from "@/services/clinicalService";

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
    getAgenda: vi.fn(),
  },
}));

function renderSidebar(props: { isOpen?: boolean; onClose?: () => void } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Sidebar {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Sidebar Navigation and Zeigarnik Counters", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(clinicalService.getAgenda).mockResolvedValue([
      {
        id: "s-1",
        patientId: "p-1",
        patientName: "Ana Clara Silva",
        date: "2026-05-28",
        time: "09:00",
        status: "needs_review",
        complement: "Evolução pendente de preenchimento",
      },
      {
        id: "s-2",
        patientId: "p-2",
        patientName: "Lucas Andrade",
        date: "2026-05-28",
        time: "10:00",
        status: "completed",
        complement: "Sessão finalizada",
      },
    ]);
  });

  it("renders semantic grouping sections: Atendimento clínico and Governança e gestão", () => {
    renderSidebar();

    expect(screen.getByText(/Atendimento Clínico/i)).toBeDefined();
    expect(screen.getByText(/Governança e gestão/i)).toBeDefined();

    expect(screen.getByRole("link", { name: /Dashboard/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Agenda/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Pacientes/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Editor Clínico/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Financeiro/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Auditoria/i })).toBeDefined();
  });

  it("renders mobile drawer and calls onClose when clicking close button or backdrop", () => {
    const onClose = vi.fn();
    renderSidebar({ isOpen: true, onClose });

    const closeBtn = screen.getByRole("button", { name: "Fechar navegação" });
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();

    const backdrop = screen.getByLabelText("Fechar navegação móvel");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("displays Zeigarnik tactile counter when there are pending reviews in agenda", async () => {
    renderSidebar();

    expect(await screen.findByText(/Pendências de Evolução/i)).toBeDefined();
    expect(screen.getByText(/aguarda evolução para fechamento ético do dia/i)).toBeDefined();
  });
});
