import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AuditPage } from "@/pages/AuditPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PatientProfilePage } from "@/pages/PatientProfilePage";
import { PatientsPage } from "@/pages/PatientsPage";
import { AgendaPage } from "@/pages/AgendaPage";
import { FinancePage } from "@/pages/FinancePage";
import { UsersPage } from "@/pages/UsersPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NarrativeEditorPage } from "@/pages/NarrativeEditorPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:patientId" element={<PatientProfilePage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/editor" element={<ProtectedRoute permission="notes:write" />}>
            <Route index element={<NarrativeEditorPage />} />
          </Route>
          <Route path="/sessions" element={<Navigate to="/agenda" replace />} />
          <Route path="/notes" element={<Navigate to="/editor" replace />} />
          <Route path="/analysis" element={<Navigate to="/patients" replace />} />
          <Route path="/longitudinal" element={<Navigate to="/patients" replace />} />
          <Route path="/finance" element={<ProtectedRoute permission="finance:read" />}>
            <Route index element={<FinancePage />} />
          </Route>
          <Route path="/audit" element={<ProtectedRoute permission="audit:read" />}>
            <Route index element={<AuditPage />} />
          </Route>
          <Route path="/users" element={<ProtectedRoute permission="users:manage" />}>
            <Route index element={<UsersPage />} />
          </Route>
          <Route path="/settings" element={<ProtectedRoute permission="settings:manage" />}>
            <Route index element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
