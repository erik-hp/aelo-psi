import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/contexts/ToastContext";
import { patients, sessions, analyses, auditEvents, longitudinalData, agendaItems, patientNotes, patientLongitudinalData, financialRecords } from "@/services/mockData";
import { DashboardPage } from "./DashboardPage";
import { PatientsPage } from "./PatientsPage";
import { PatientProfilePage } from "./PatientProfilePage";
import { AgendaPage } from "./AgendaPage";
import { NarrativeEditorPage } from "./NarrativeEditorPage";
import { FinancePage } from "./FinancePage";
import { AuditPage } from "./AuditPage";
import { UsersPage } from "./UsersPage";
import { SettingsPage } from "./SettingsPage";
import { LoginPage } from "./LoginPage";
import { NotFoundPage } from "./NotFoundPage";
import { SessionsPage } from "./SessionsPage";
import { AIAnalysisPage } from "./AIAnalysisPage";
import { LongitudinalDashboardPage } from "./LongitudinalDashboardPage";

const auth = vi.hoisted(() => ({ authenticated: true }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({
  user: { id: "synthetic-professional", name: "Profissional sintético", role: "PSYCHOLOGIST" },
  isAuthenticated: auth.authenticated, isLoading: false, can: () => true, permissions: [], login: vi.fn(), logout: vi.fn(),
}) }));

let client: QueryClient;
afterEach(() => { cleanup(); client?.clear(); });

const pages = [
  [DashboardPage, "Dashboard Clínico"], [PatientsPage, "Pacientes"],
  [PatientProfilePage, patients[0].name], [AgendaPage, "Agenda Clínica"],
  [NarrativeEditorPage, "Editor Narrativo de Prontuário"], [FinancePage, "Financeiro"],
  [AuditPage, "Trilha de Auditoria & Conformidade LGPD"], [UsersPage, "Usuários"],
  [SettingsPage, "Configurações"], [LoginPage, "AELO"],
  [NotFoundPage, "Página não encontrada"], [SessionsPage, "Sessões terapêuticas"],
  [AIAnalysisPage, "IA assistiva"], [LongitudinalDashboardPage, "Longitudinal por paciente"],
] as const;

describe("Rendering inventory of every existing page with synthetic data", () => {
  it.each(pages)("renders %s without breaking its page heading", (Page, title) => {
    auth.authenticated = Page !== LoginPage;
    client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(["dashboard"], { patients, sessions, analyses, auditEvents, longitudinalData });
    client.setQueryData(["patients"], patients);
    client.setQueryData(["agenda"], agendaItems);
    client.setQueryData(["finance"], financialRecords);
    client.setQueryData(["audit-events"], auditEvents);
    client.setQueryData(["patient", patients[0].id], { patient: patients[0], sessions, analyses });
    client.setQueryData(["patient-notes", patients[0].id], patientNotes);
    client.setQueryData(["patient-longitudinal", patients[0].id], patientLongitudinalData);
    render(<QueryClientProvider client={client}><ToastProvider>
      <MemoryRouter initialEntries={[`/patients/${patients[0].id}`]}>
        <Routes><Route path="/patients/:patientId" element={<Page />} /></Routes>
      </MemoryRouter>
    </ToastProvider></QueryClientProvider>);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeDefined();
  });
});
