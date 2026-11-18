import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/contexts/ToastContext";
import { PatientsPage } from "./PatientsPage";
import { AgendaPage } from "./AgendaPage";
import { ClinicalEditorPage } from "./ClinicalEditorPage";
import { UsersPage } from "./UsersPage";
import { PatientProfilePage } from "./PatientProfilePage";
import type { ApiPatient, ApiSession } from "@/services/clinicalMappers";
import type {
  ClinicalNoteRecord,
  EligibleAssigneeRecord,
  PatientGrantRecord,
  StaffRecord,
} from "@/services/recordService";
import { signingService } from "@/services/signingService";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
const auth = vi.hoisted(() => ({ role: "PSYCHOLOGIST", canWrite: true }));
vi.mock("@/api/client", () => ({ apiClient: http }));
vi.mock("@/services/runtime", () => ({ isApiMode: true }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "professional-1", role: auth.role },
    permissions: [],
    can: (permission: string) => permission.endsWith(":read") || auth.canWrite,
  }),
}));

let patients: ApiPatient[];
let sessions: ApiSession[];
let notes: ClinicalNoteRecord[];
let grants: PatientGrantRecord[];
let eligibleAssignees: EligibleAssigneeRecord[];
let staffUsers: StaffRecord[];
let client: QueryClient;

beforeEach(() => {
  auth.role = "PSYCHOLOGIST";
  auth.canWrite = true;
  patients = [
    {
      id: "p-1",
      display_name: "Paciente sintético",
      internal_code: "SYN-01",
      status: "ACTIVE",
      created_at: "2026-11-06",
      updated_at: "2026-11-06",
    },
  ];
  sessions = [];
  notes = [];
  grants = [
    {
      id: 1,
      patient: "p-1",
      user: "professional-1",
      user_username: "psi_helena",
      user_role: "PSYCHOLOGIST",
      user_display: "Dra. Helena Sintética",
      can_edit: true,
    },
  ];
  eligibleAssignees = [
    {
      id: 22,
      username: "estag_lucas",
      display_name: "Lucas Sintético",
      role: "INTERN",
    },
  ];
  staffUsers = [
    {
      id: 10,
      username: "psi_bruno",
      email: "bruno@clinica.local",
      first_name: "Bruno",
      last_name: "Sintético",
      role: "PSYCHOLOGIST",
      is_active: true,
    },
  ];

  http.get.mockReset().mockImplementation(async (url: string) => {
    if (url === "/patients/p-1/") return { data: patients[0] };
    if (url === "/patients/p-1/eligible-assignees/") return { data: eligibleAssignees };
    if (url === "/patients/p-1/fhir/") {
      return { data: new Blob([JSON.stringify({ resourceType: "Bundle" })], { type: "application/fhir+json" }) };
    }
    if (url.endsWith("/access-grants/")) return { data: { results: grants } };
    if (url === "/patients/") return { data: { results: patients } };
    if (url === "/sessions/") return { data: { results: sessions } };
    if (url === "/clinical-notes/") return { data: { results: notes } };
    if (url === "/analysis/") return { data: { results: [] } };
    if (url === "/users/") return { data: { results: staffUsers } };
    return { data: { results: [] } };
  });

  http.post.mockReset().mockImplementation(async (url: string, input?: Record<string, unknown>) => {
    if (url === "/patients/") {
      const item = {
        ...patients[0],
        id: "p-new",
        display_name: String(input?.display_name ?? ""),
        internal_code: String(input?.internal_code ?? ""),
      };
      patients.push(item);
      return { data: item };
    }
    if (url === "/sessions/") {
      const item: ApiSession = {
        id: "s-new",
        patient: String(input?.patient ?? ""),
        professional: "professional-1",
        status: "SCHEDULED",
        scheduled_at: String(input?.scheduled_at ?? ""),
        summary: String(input?.summary ?? ""),
      };
      sessions.push(item);
      return { data: item };
    }
    if (url === "/clinical-notes/") {
      const item: ClinicalNoteRecord = {
        id: "n-1",
        patient: String(input?.patient ?? ""),
        session: String(input?.session ?? ""),
        raw_text: String(input?.raw_text ?? ""),
        author: "professional-1",
        version: 1,
        locked_at: null,
      };
      notes.push(item);
      return { data: item };
    }
    if (url === "/users/") {
      const created: StaffRecord = {
        id: 11,
        username: String(input?.username ?? ""),
        email: String(input?.email ?? ""),
        first_name: String(input?.first_name ?? ""),
        last_name: String(input?.last_name ?? ""),
        role: String(input?.role ?? "PSYCHOLOGIST"),
        license_number: String(input?.license_number ?? ""),
        is_active: true,
      };
      staffUsers.push(created);
      return { data: created };
    }
    if (url === "/patients/p-1/grant-access/") {
      const targetId = input?.user as string | number;
      const matched = eligibleAssignees.find((item) => String(item.id) === String(targetId));
      const created: PatientGrantRecord = {
        id: 2,
        patient: "p-1",
        user: targetId,
        user_username: matched?.username ?? `u_${targetId}`,
        user_role: matched?.role ?? "PSYCHOLOGIST",
        user_display: matched?.display_name ?? `Profissional ${targetId}`,
        can_edit: Boolean(input?.can_edit),
      };
      grants = [...grants, created];
      eligibleAssignees = eligibleAssignees.filter((item) => String(item.id) !== String(targetId));
      return { data: created };
    }
    if (url === "/patients/p-1/revoke-access/") {
      const targetId = input?.user;
      grants = grants.filter((item) => String(item.user) !== String(targetId));
      return { data: { status: "revoked" } };
    }
    if (url === "/patients/p-1/archive/") {
      patients[0] = { ...patients[0], status: "ARCHIVED" };
      return { data: patients[0] };
    }
    throw new Error(`Unexpected write endpoint: ${url}`);
  });

  http.patch.mockReset().mockImplementation(async (url: string, input: Record<string, unknown>) => {
    if (url.startsWith("/sessions/")) {
      sessions[0] = {
        ...sessions[0],
        ...(typeof input.status === "string" ? { status: input.status as ApiSession["status"] } : {}),
        ...(typeof input.scheduled_at === "string" ? { scheduled_at: input.scheduled_at } : {}),
        ...(typeof input.summary === "string" ? { summary: input.summary } : {}),
      };
      return { data: sessions[0] };
    }
    if (url.startsWith("/users/")) {
      const userId = url.split("/").filter(Boolean)[1];
      staffUsers = staffUsers.map((item) =>
        String(item.id) === userId ? { ...item, is_active: Boolean(input.is_active) } : item,
      );
      const updated = staffUsers.find((item) => String(item.id) === userId)!;
      return { data: updated };
    }
    throw new Error(`Unexpected PATCH endpoint: ${url}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  client?.clear();
});

function show(
  Page: typeof PatientsPage | typeof AgendaPage | typeof ClinicalEditorPage | typeof UsersPage,
  url = "/patients",
) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[url]}>
          <Page />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function showRoute(pathPattern: string, element: ReactElement, url: string) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path={pathPattern} element={element} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function existingSession() {
  const noonToday = new Date();
  noonToday.setHours(12, 0, 0, 0);
  sessions = [
    {
      id: "s-1",
      patient: "p-1",
      professional: "professional-1",
      status: "SCHEDULED",
      scheduled_at: noonToday.toISOString(),
      summary: "",
    },
  ];
}

describe("Operational flows in API mode, with real frontend services", () => {
  it.each([
    ["Cancelar sessão", "CANCELLED"],
    ["Registrar falta", "MISSED"],
  ])("asks before saving %s", async (label, status) => {
    existingSession();
    const user = userEvent.setup();
    show(AgendaPage, "/agenda");
    await user.click(await screen.findByRole("button", { name: label }));
    expect(http.patch).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: `Sim, ${label.toLowerCase()}` }));
    await waitFor(() => expect(http.patch).toHaveBeenCalledWith("/sessions/s-1/", { status }));
  });

  it("keeps the session untouched when the confirmation is dismissed", async () => {
    existingSession();
    const user = userEvent.setup();
    show(AgendaPage, "/agenda");
    await user.click(await screen.findByRole("button", { name: "Cancelar sessão" }));
    await user.click(await screen.findByRole("button", { name: "Voltar" }));
    expect(http.patch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancelar sessão" })).toBeDefined();
  });

  it("creates a patient through POST and reloads the directory", async () => {
    const user = userEvent.setup();
    show(PatientsPage);
    await user.click(screen.getByRole("button", { name: "Adicionar paciente" }));
    await user.type(screen.getByLabelText("Nome de identificação"), "Novo paciente sintético");
    await user.type(screen.getByLabelText("Código interno"), "SYN-02");
    await user.click(screen.getByRole("button", { name: "Cadastrar paciente" }));
    expect(await screen.findByText("Novo paciente sintético")).toBeDefined();
    expect(http.post).toHaveBeenCalledWith("/patients/", {
      display_name: "Novo paciente sintético",
      internal_code: "SYN-02",
    });
  });

  it("keeps the patient form and reports an API rejection", async () => {
    http.post.mockRejectedValueOnce(
      Object.assign(new Error("Rejected"), { isAxiosError: true, response: { status: 400 } }),
    );
    const user = userEvent.setup();
    show(PatientsPage);
    await user.click(screen.getByRole("button", { name: "Adicionar paciente" }));
    await user.type(screen.getByLabelText("Nome de identificação"), "Sintético");
    await user.type(screen.getByLabelText("Código interno"), "SYN-01");
    await user.click(screen.getByRole("button", { name: "Cadastrar paciente" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("persists a session for a real patient and updates status through PATCH without claiming a signature", async () => {
    const user = userEvent.setup();
    show(AgendaPage, "/agenda");
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

  it("reschedules an active session via PATCH and surfaces overlap rejections without closing the modal", async () => {
    existingSession();
    http.patch.mockRejectedValueOnce(
      Object.assign(new Error("Overlap"), {
        isAxiosError: true,
        response: { status: 400, data: { scheduled_at: ["Intervalo sobreposto para este profissional."] } },
      }),
    );

    const user = userEvent.setup();
    show(AgendaPage, "/agenda");
    await user.click(await screen.findByRole("button", { name: "Remarcar" }));
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Nova data"), { target: { value: "2030-01-12" } });
    fireEvent.change(screen.getByLabelText("Novo horário"), { target: { value: "15:30" } });
    await user.type(screen.getByLabelText("Observações da remarcação"), "Ajuste sintético de agenda");
    await user.click(screen.getByRole("button", { name: "Confirmar remarcação" }));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("dialog")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Confirmar remarcação" }));
    await waitFor(() =>
      expect(http.patch).toHaveBeenLastCalledWith("/sessions/s-1/", {
        scheduled_at: new Date("2030-01-12T15:30:00").toISOString(),
        summary: "Ajuste sintético de agenda",
      }),
    );
  });

  it("starts the editor empty, saves without AI, and reloads the persisted original text", async () => {
    existingSession();
    const user = userEvent.setup();
    const view = show(ClinicalEditorPage, "/editor?patient=p-1&session=s-1");
    const field = (await screen.findByLabelText("Nota da sessão")) as HTMLTextAreaElement;
    expect(field.value).toBe("");
    await user.type(field, "Registro sintético técnico da sessão, sem conteúdo de paciente real.");
    await user.click(screen.getByRole("button", { name: "Salvar nota" }));
    expect(await screen.findByText(/Nota salva no servidor/)).toBeDefined();
    expect(http.post.mock.calls.every(([url]) => url === "/clinical-notes/")).toBe(true);
    view.unmount();
    client.clear();
    show(ClinicalEditorPage, "/editor?patient=p-1&session=s-1");
    expect(((await screen.findByLabelText("Nota da sessão")) as HTMLTextAreaElement).value).toBe(notes[0].raw_text);
    expect(notes).toHaveLength(1);
  });

  it("retains the clinical text when the server refuses a save", async () => {
    existingSession();
    http.post.mockRejectedValueOnce(
      Object.assign(new Error("Forbidden"), { isAxiosError: true, response: { status: 403 } }),
    );
    const user = userEvent.setup();
    show(ClinicalEditorPage, "/editor?patient=p-1&session=s-1");
    const field = (await screen.findByLabelText("Nota da sessão")) as HTMLTextAreaElement;
    await user.type(field, "Texto sintético preservado após falha.");
    await user.click(screen.getByRole("button", { name: "Salvar nota" }));
    await screen.findByRole("alert");
    expect(field.value).toBe("Texto sintético preservado após falha.");
    expect(notes).toHaveLength(0);
  });

  it("hides patient creation and scheduling from interns", async () => {
    auth.role = "INTERN";
    auth.canWrite = false;
    const view = show(PatientsPage);
    expect(await screen.findByText("Paciente sintético")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Adicionar paciente" })).toBeNull();
    view.unmount();
    show(AgendaPage, "/agenda");
    await waitFor(() => expect(client.getQueryState(["agenda"])?.status).toBe("success"));
    expect(screen.queryByRole("button", { name: /Nova sessão/ })).toBeNull();
  });

  it("does not open an editor for a read-only patient grant", async () => {
    existingSession();
    const original = http.get.getMockImplementation()!;
    http.get.mockImplementation((url: string) =>
      url.endsWith("/access-grants/")
        ? Promise.resolve({ data: [{ user: "professional-1", can_edit: false }] })
        : original(url),
    );
    show(ClinicalEditorPage, "/editor?patient=p-1&session=s-1");
    expect(await screen.findByText(/Seu vínculo não permite edição clínica/)).toBeDefined();
    expect(screen.queryByLabelText("Nota da sessão")).toBeNull();
    expect(http.get.mock.calls.some(([url]) => url === "/clinical-notes/")).toBe(false);
  });

  it("submits a saved note to review, signs it, blocks direct edits, and completes formal rectification", async () => {
    existingSession();
    notes = [
      {
        id: "n-1",
        patient: "p-1",
        session: "s-1",
        raw_text: "Texto sintético inicial antes da assinatura.",
        author: "professional-1",
        version: 1,
        status: "DRAFT",
        locked_at: null,
      },
    ];
    http.post.mockImplementation(async (url: string) => {
      if (url === "/clinical-notes/n-1/submit-review/") {
        notes[0] = { ...notes[0], status: "IN_REVIEW" };
        return { data: notes[0] };
      }
      throw new Error(`Unexpected write endpoint: ${url}`);
    });
    const signSpy = vi.spyOn(signingService, "signNote").mockImplementation(async () => {
      notes[0] = { ...notes[0], status: "SIGNED", locked_at: "2026-11-17T22:00:00Z" };
      return notes[0];
    });
    const amendSpy = vi.spyOn(signingService, "amendNote").mockImplementation(async (_id, rawText) => {
      notes[0] = { ...notes[0], raw_text: rawText, version: 2, status: "AMENDED", locked_at: "2026-11-17T22:05:00Z" };
      return notes[0];
    });

    const user = userEvent.setup();
    show(ClinicalEditorPage, "/editor?patient=p-1&session=s-1");
    expect(await screen.findByText("Rascunho")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Submeter à revisão" }));
    expect(await screen.findByText("Em revisão")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Assinar nota" }));
    await user.click(await screen.findByRole("button", { name: "Assinar e bloquear" }));
    expect(await screen.findByText("Assinada")).toBeDefined();
    expect(signSpy).toHaveBeenCalledWith("n-1", "professional-1");

    const noteField = screen.getByLabelText("Nota da sessão") as HTMLTextAreaElement;
    expect(noteField.readOnly).toBe(true);

    await user.click(screen.getByRole("button", { name: "Retificar nota assinada" }));
    const amendTextField = await screen.findByLabelText("Texto retificado da nota");
    await user.clear(amendTextField);
    await user.type(amendTextField, "Texto sintético retificado formalmente após assinatura.");
    await user.type(screen.getByLabelText("Motivo formal da retificação"), "Complemento formal sintético de relato.");
    await user.click(screen.getByRole("button", { name: "Assinar retificação" }));

    expect(await screen.findByText("Retificada e assinada")).toBeDefined();
    expect(amendSpy).toHaveBeenCalledWith(
      "n-1",
      "Texto sintético retificado formalmente após assinatura.",
      "Complemento formal sintético de relato.",
      "professional-1",
    );
  });

  it("provisions clinic staff and deactivates accounts through /users/ as ADMIN", async () => {
    auth.role = "ADMIN";
    auth.canWrite = true;
    const user = userEvent.setup();
    show(UsersPage, "/users");

    expect(await screen.findByText("Bruno Sintético")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Cadastrar profissional" }));
    await user.type(screen.getByLabelText("Nome"), "Lia");
    await user.type(screen.getByLabelText("Sobrenome"), "Sintética");
    await user.type(screen.getByLabelText("Usuário de acesso"), "estag_lia");
    await user.type(screen.getByLabelText("E-mail institucional"), "lia@clinica.local");
    await user.selectOptions(screen.getByLabelText("Perfil"), "INTERN");
    await user.type(screen.getByLabelText("Senha inicial (mínimo 8 caracteres)"), "SenhaSeguraSintetica123!");
    await user.click(screen.getByRole("button", { name: "Confirmar cadastro" }));

    expect(await screen.findByText("Lia Sintética")).toBeDefined();
    expect(http.post).toHaveBeenCalledWith("/users/", {
      username: "estag_lia",
      email: "lia@clinica.local",
      first_name: "Lia",
      last_name: "Sintética",
      role: "INTERN",
      license_number: "",
      password: "SenhaSeguraSintetica123!",
      is_active: true,
    });

    const deactivateButtons = screen.getAllByRole("button", { name: "Desativar conta" });
    await user.click(deactivateButtons[0]);
    await user.click(await screen.findByRole("button", { name: "Sim, desativar" }));

    await waitFor(() => expect(http.patch).toHaveBeenCalledWith("/users/10/", { is_active: false }));
    expect(await screen.findByText("Inativo")).toBeDefined();
  });

  it("manages clinical access grants and exports official-only FHIR R4 bundle for authorized psychologist", async () => {
    globalThis.URL.createObjectURL = vi.fn(() => "blob:synthetic-fhir");
    globalThis.URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const user = userEvent.setup();
    showRoute("/patients/:patientId", <PatientProfilePage />, "/patients/p-1");

    expect(await screen.findByText("Dra. Helena Sintética")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Arquivar paciente" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Conceder acesso" }));
    await screen.findByRole("option", { name: "Lucas Sintético (INTERN)" });
    await user.selectOptions(screen.getByLabelText("Profissional da clínica"), "22");
    await user.click(screen.getByRole("button", { name: "Confirmar vínculo" }));

    expect(await screen.findByText("Lucas Sintético")).toBeDefined();
    expect(http.post).toHaveBeenCalledWith("/patients/p-1/grant-access/", {
      user: 22,
      can_edit: false,
    });

    const revokeButtons = screen.getAllByRole("button", { name: "Revogar acesso" });
    await user.click(revokeButtons[1]);
    await user.click(await screen.findByRole("button", { name: "Sim, revogar acesso" }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith("/patients/p-1/revoke-access/", { user: 22 }));

    await user.click(screen.getByRole("button", { name: "Exportar FHIR R4" }));
    await waitFor(() =>
      expect(http.get).toHaveBeenCalledWith("/patients/p-1/fhir/", {
        params: { official_only: 1 },
        responseType: "blob",
      }),
    );
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:synthetic-fhir");
  });

  it("allows ADMIN to archive a patient and assign initial psychologist without exposing FHIR export or clinical notes", async () => {
    auth.role = "ADMIN";
    auth.canWrite = true;
    grants = [];
    eligibleAssignees = [
      { id: 30, username: "psi_marina", display_name: "Dra. Marina Sintética", role: "PSYCHOLOGIST" },
    ];

    const user = userEvent.setup();
    showRoute("/patients/:patientId", <PatientProfilePage />, "/patients/p-1");

    expect(await screen.findByText("Conteúdo clínico restrito")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Exportar FHIR R4" })).toBeNull();
    expect(http.get.mock.calls.some(([url]) => url === "/clinical-notes/")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Designar psicólogo" }));
    await screen.findByRole("option", { name: "Dra. Marina Sintética (PSYCHOLOGIST)" });
    await user.selectOptions(screen.getByLabelText("Profissional da clínica"), "30");
    await user.click(screen.getByRole("button", { name: "Confirmar vínculo" }));
    await waitFor(() =>
      expect(http.post).toHaveBeenCalledWith("/patients/p-1/grant-access/", {
        user: 30,
        can_edit: true,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Arquivar paciente" }));
    await user.click(await screen.findByRole("button", { name: "Sim, arquivar paciente" }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith("/patients/p-1/archive/"));
    expect(await screen.findByText("Inativo")).toBeDefined();
  });
});
