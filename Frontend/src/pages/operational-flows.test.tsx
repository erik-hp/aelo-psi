import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/contexts/ToastContext";
import { PatientsPage } from "./PatientsPage";
import { AgendaPage } from "./AgendaPage";
import { ClinicalEditorPage } from "./ClinicalEditorPage";
import type { ApiPatient, ApiSession } from "@/services/clinicalMappers";
import type { ClinicalNoteRecord } from "@/services/recordService";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
const auth = vi.hoisted(() => ({ role: "PSYCHOLOGIST", canWrite: true }));
vi.mock("@/api/client", () => ({ apiClient: http }));
vi.mock("@/services/runtime", () => ({ isApiMode: true }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "professional-1", role: auth.role }, permissions: [], can: (permission: string) => permission.endsWith(":read") || auth.canWrite }) }));

let patients: ApiPatient[];
let sessions: ApiSession[];
let notes: ClinicalNoteRecord[];
let client: QueryClient;
beforeEach(() => {
  auth.role = "PSYCHOLOGIST"; auth.canWrite = true;
  patients = [{ id: "p-1", display_name: "Paciente sintético", internal_code: "SYN-01", status: "ACTIVE", created_at: "2026-11-06", updated_at: "2026-11-06" }];
  sessions = []; notes = [];
  http.get.mockReset().mockImplementation(async (url: string) => ({ data: { results: url.endsWith("/access-grants/") ? [{ user: "professional-1", can_edit: true }] : url === "/patients/" ? patients : url === "/sessions/" ? sessions : url === "/clinical-notes/" ? notes : [] } }));
  http.post.mockReset().mockImplementation(async (url: string, input: Record<string, string>) => {
    if (url === "/patients/") { const item = { ...patients[0], id: "p-new", display_name: input.display_name, internal_code: input.internal_code }; patients.push(item); return { data: item }; }
    if (url === "/sessions/") { const item: ApiSession = { id: "s-new", patient: input.patient, professional: "professional-1", status: "SCHEDULED", scheduled_at: input.scheduled_at, summary: input.summary }; sessions.push(item); return { data: item }; }
    if (url === "/clinical-notes/") { const item: ClinicalNoteRecord = { id: "n-1", patient: input.patient, session: input.session, raw_text: input.raw_text, author: "professional-1", version: 1, locked_at: null }; notes.push(item); return { data: item }; }
    throw new Error("Unexpected write endpoint");
  });
  http.patch.mockReset().mockImplementation(async (_url: string, input: { status: ApiSession["status"] }) => { sessions[0].status = input.status; return { data: sessions[0] }; });
});
afterEach(() => { cleanup(); client?.clear(); });
function show(Page: typeof PatientsPage | typeof AgendaPage | typeof ClinicalEditorPage, url = "/patients") {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ToastProvider><MemoryRouter initialEntries={[url]}><Page /></MemoryRouter></ToastProvider></QueryClientProvider>);
}
function existingSession() {
  const noonToday = new Date();
  noonToday.setHours(12, 0, 0, 0);
  sessions = [{ id: "s-1", patient: "p-1", professional: "professional-1", status: "SCHEDULED", scheduled_at: noonToday.toISOString(), summary: "" }];
}

describe("Operational flows in API mode, with real frontend services", () => {
  it.each([["Cancelar sessão", "CANCELLED"], ["Registrar falta", "MISSED"]])("asks before saving %s", async (label, status) => {
    existingSession();
    const user = userEvent.setup(); show(AgendaPage, "/agenda");
    await user.click(await screen.findByRole("button", { name: label }));
    expect(http.patch).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: `Sim, ${label.toLowerCase()}` }));
    await waitFor(() => expect(http.patch).toHaveBeenCalledWith("/sessions/s-1/", { status }));
  });

  it("keeps the session untouched when the confirmation is dismissed", async () => {
    existingSession();
    const user = userEvent.setup(); show(AgendaPage, "/agenda");
    await user.click(await screen.findByRole("button", { name: "Cancelar sessão" }));
    await user.click(await screen.findByRole("button", { name: "Voltar" }));
    expect(http.patch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancelar sessão" })).toBeDefined();
  });

  it("creates a patient through POST and reloads the directory", async () => {
    const user = userEvent.setup(); show(PatientsPage);
    await user.click(screen.getByRole("button", { name: "Adicionar paciente" }));
    await user.type(screen.getByLabelText("Nome de identificação"), "Novo paciente sintético");
    await user.type(screen.getByLabelText("Código interno"), "SYN-02");
    await user.click(screen.getByRole("button", { name: "Cadastrar paciente" }));
    expect(await screen.findByText("Novo paciente sintético")).toBeDefined();
    expect(http.post).toHaveBeenCalledWith("/patients/", { display_name: "Novo paciente sintético", internal_code: "SYN-02" });
  });

  it("keeps the patient form and reports an API rejection", async () => {
    http.post.mockRejectedValueOnce(Object.assign(new Error("Rejected"), { isAxiosError: true, response: { status: 400 } }));
    const user = userEvent.setup(); show(PatientsPage);
    await user.click(screen.getByRole("button", { name: "Adicionar paciente" }));
    await user.type(screen.getByLabelText("Nome de identificação"), "Sintético");
    await user.type(screen.getByLabelText("Código interno"), "SYN-01");
    await user.click(screen.getByRole("button", { name: "Cadastrar paciente" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("persists a session for a real patient and updates status through PATCH without claiming a signature", async () => {
    const user = userEvent.setup(); show(AgendaPage, "/agenda");
    await user.click(screen.getByRole("button", { name: /Nova sessão/ }));
    await screen.findByRole("option", { name: "Paciente sintético" });
    await user.selectOptions(screen.getByLabelText("Paciente cadastrado"), "p-1");
    fireEvent.change(screen.getByLabelText(/Data da Consulta/), { target: { value: "2030-01-10" } });
    fireEvent.change(screen.getByLabelText(/Horário/), { target: { value: "09:30" } });
    await user.click(screen.getByRole("button", { name: "Confirmar Agendamento" }));
    const complete = await screen.findByRole("button", { name: "Concluir atendimento" });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].patient).toBe("p-1");
    expect(sessions[0].scheduled_at).toBe(new Date("2030-01-10T09:30:00").toISOString());
    await user.click(complete);
    expect(await screen.findByText("Atendimento concluído", { selector: "span" })).toBeDefined();
    expect(http.patch).toHaveBeenCalledWith("/sessions/s-new/", { status: "COMPLETED" });
    expect(screen.queryByText("Finalizada e assinada")).toBeNull();
  });

  it("starts the editor empty, saves without AI, and reloads the persisted original text", async () => {
    existingSession(); const user = userEvent.setup();
    const view = show(ClinicalEditorPage, "/editor?patient=p-1&session=s-1");
    const field = await screen.findByLabelText("Nota da sessão") as HTMLTextAreaElement;
    expect(field.value).toBe("");
    await user.type(field, "Registro sintético técnico da sessão, sem conteúdo de paciente real.");
    await user.click(screen.getByRole("button", { name: "Salvar nota" }));
    expect(await screen.findByText(/Nota salva no servidor/)).toBeDefined();
    expect(http.post.mock.calls.every(([url]) => url === "/clinical-notes/")).toBe(true);
    view.unmount(); client.clear();
    show(ClinicalEditorPage, "/editor?patient=p-1&session=s-1");
    expect((await screen.findByLabelText("Nota da sessão") as HTMLTextAreaElement).value).toBe(notes[0].raw_text);
    expect(notes).toHaveLength(1);
  });

  it("retains the clinical text when the server refuses a save", async () => {
    existingSession(); http.post.mockRejectedValueOnce(Object.assign(new Error("Forbidden"), { isAxiosError: true, response: { status: 403 } }));
    const user = userEvent.setup(); show(ClinicalEditorPage, "/editor?patient=p-1&session=s-1");
    const field = await screen.findByLabelText("Nota da sessão") as HTMLTextAreaElement;
    await user.type(field, "Texto sintético preservado após falha.");
    await user.click(screen.getByRole("button", { name: "Salvar nota" }));
    await screen.findByRole("alert");
    expect(field.value).toBe("Texto sintético preservado após falha.");
    expect(notes).toHaveLength(0);
  });

  it("hides patient creation and scheduling from interns", async () => {
    auth.role = "INTERN"; auth.canWrite = false;
    const view = show(PatientsPage);
    expect(await screen.findByText("Paciente sintético")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Adicionar paciente" })).toBeNull();
    view.unmount(); show(AgendaPage, "/agenda");
    await waitFor(() => expect(client.getQueryState(["agenda"])?.status).toBe("success"));
    expect(screen.queryByRole("button", { name: /Nova sessão/ })).toBeNull();
  });

  it("does not open an editor for a read-only patient grant", async () => {
    existingSession();
    const original = http.get.getMockImplementation()!;
    http.get.mockImplementation((url: string) => url.endsWith("/access-grants/") ? Promise.resolve({ data: [{ user: "professional-1", can_edit: false }] }) : original(url));
    show(ClinicalEditorPage, "/editor?patient=p-1&session=s-1");
    expect(await screen.findByText(/Seu vínculo não permite edição clínica/)).toBeDefined();
    expect(screen.queryByLabelText("Nota da sessão")).toBeNull();
    expect(http.get.mock.calls.some(([url]) => url === "/clinical-notes/")).toBe(false);
  });
});
