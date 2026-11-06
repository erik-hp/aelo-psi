import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format } from "date-fns";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "@/pages/DashboardPage";
import { clinicalService } from "./clinicalService";

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/api/client", () => ({ apiClient: http }));
vi.mock("./runtime", () => ({ isApiMode: true }));

let client: QueryClient;
beforeEach(() => {
  http.get.mockReset().mockResolvedValue({ data: { results: [] } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); });

function loadAsQueryCallback() {
  return client.fetchQuery({ queryKey: ["agenda"], queryFn: clinicalService.getAgenda });
}

// The agenda shows the browser timezone, so the expectation must follow the machine running the test.
const scheduledAt = "2026-11-06T10:30:00-03:00";

describe("Agenda in API mode through React Query", () => {
  it("loads patients and sessions when the query calls the method without its object context", async () => {
    http.get.mockImplementation(async (url: string) => ({ data: { results: url === "/patients/" ? [{
      id: "synthetic-patient", internal_code: "SYN-01", display_name: "Paciente sintético", status: "ACTIVE",
      created_at: "2026-11-06T08:00:00Z", updated_at: "2026-11-06T08:00:00Z",
    }] : [{ id: "synthetic-session", patient: "synthetic-patient", scheduled_at: scheduledAt, status: "SCHEDULED", summary: "Registro sintético" }] } }));
    await expect(loadAsQueryCallback()).resolves.toEqual([{
      id: "synthetic-session", patientId: "synthetic-patient", patientName: "Paciente sintético",
      date: format(new Date(scheduledAt), "yyyy-MM-dd"), time: format(new Date(scheduledAt), "HH:mm"), status: "draft", complement: "Registro sintético", attentionIndex: null,
    }]);
    expect(http.get).toHaveBeenCalledWith("/patients/");
    expect(http.get).toHaveBeenCalledWith("/sessions/");
  });

  it("treats an authorized empty agenda as an empty successful result", async () => {
    await expect(loadAsQueryCallback()).resolves.toEqual([]);
    expect(client.getQueryState(["agenda"])?.status).toBe("success");
  });

  it.each([
    ["/patients/", 401], ["/sessions/", 401], ["/patients/", 403], ["/sessions/", 403],
    ["/patients/", 500], ["/sessions/", 500],
  ])("preserves %s HTTP %s instead of substituting demonstration data", async (endpoint, status) => {
    const error = Object.assign(new Error("API request failed"), { response: { status } });
    http.get.mockImplementation((url: string) => url === endpoint ? Promise.reject(error) : Promise.resolve({ data: { results: [] } }));
    await expect(loadAsQueryCallback()).rejects.toBe(error);
  });

  it("renders the empty dashboard agenda without the synchronization error using the real service", async () => {
    render(<QueryClientProvider client={client}><MemoryRouter><DashboardPage /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText(/Jornada clínica do dia sem atendimentos pendentes/)).toBeDefined();
    expect(screen.queryByText(/Não foi possível sincronizar a agenda imediata/)).toBeNull();
    expect(client.getQueryState(["agenda"])?.status).toBe("success");
  });
});
