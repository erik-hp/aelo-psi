import { apiClient } from "@/api/client";
import { getCollection } from "@/api/collections";
import { isApiMode } from "./runtime";
import { mapPatient, mapSession, type ApiPatient, type ApiSession } from "./clinicalMappers";

export type ClinicalNoteStatus = "DRAFT" | "IN_REVIEW" | "SIGNED" | "AMENDED";

export interface ClinicalNoteRecord {
  id: string; patient: string; session: string | null; author: string | number;
  raw_text: string; version: number; locked_at: string | null;
  status?: ClinicalNoteStatus; signed_by?: string | number | null; signed_at?: string | null;
}

export interface ClinicalNoteHistoryRecord {
  id: string | number; version: number; edited_by: string | number;
  raw_text: string; status_at_archive: string; amendment_reason: string; created_at: string;
}

export interface StaffRecord {
  id: string | number; username: string; email: string;
  first_name: string; last_name: string; role: string;
  license_number?: string; is_active: boolean;
}

export interface PatientGrantRecord {
  id: string | number; patient: string; user: string | number;
  user_username?: string; user_role?: string; user_display?: string;
  can_edit: boolean; created_at?: string;
}

export interface EligibleAssigneeRecord {
  id: string | number; username: string; display_name: string; role: "PSYCHOLOGIST" | "INTERN";
}

function requireApi() { if (!isApiMode) throw new Error("Esta operação exige conexão com a API. A demonstração não salva registros."); }

export const recordService = {
  async canEditPatient(patientId: string, userId: string) {
    requireApi();
    const grants = await getCollection<{ user: string | number; can_edit: boolean }>(`/patients/${patientId}/access-grants/`);
    return grants.some((grant) => String(grant.user) === userId && grant.can_edit);
  },
  async getPatientGrants(patientId: string) {
    requireApi();
    return getCollection<PatientGrantRecord>(`/patients/${patientId}/access-grants/`);
  },
  async getEligibleAssignees(patientId: string) {
    requireApi();
    const { data } = await apiClient.get<EligibleAssigneeRecord[]>(`/patients/${patientId}/eligible-assignees/`);
    return data;
  },
  async grantPatientAccess(patientId: string, input: { userId: string | number; canEdit: boolean }) {
    requireApi();
    const parsedUser = typeof input.userId === "string" && /^\d+$/.test(input.userId) ? Number(input.userId) : input.userId;
    const { data } = await apiClient.post<PatientGrantRecord>(`/patients/${patientId}/grant-access/`, {
      user: parsedUser,
      can_edit: input.canEdit,
    });
    return data;
  },
  async revokePatientAccess(patientId: string, userId: string | number) {
    requireApi();
    const parsedUser = typeof userId === "string" && /^\d+$/.test(userId) ? Number(userId) : userId;
    await apiClient.post(`/patients/${patientId}/revoke-access/`, { user: parsedUser });
  },
  async archivePatient(patientId: string) {
    requireApi();
    const { data } = await apiClient.post<ApiPatient>(`/patients/${patientId}/archive/`);
    return mapPatient(data);
  },
  async downloadPatientFhir(patientId: string, officialOnly = true) {
    requireApi();
    const { data } = await apiClient.get<Blob>(`/patients/${patientId}/fhir/`, {
      params: officialOnly ? { official_only: 1 } : undefined,
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aelo-fhir-${patientId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },
  async getUsers() { requireApi(); return getCollection<StaffRecord>("/users/"); },
  async createStaffUser(input: {
    username: string; email: string; firstName: string; lastName: string;
    role: "PSYCHOLOGIST" | "INTERN"; licenseNumber?: string; password: string;
  }) {
    requireApi();
    const { data } = await apiClient.post<StaffRecord>("/users/", {
      username: input.username.trim(),
      email: input.email.trim(),
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      role: input.role,
      license_number: (input.licenseNumber ?? "").trim(),
      password: input.password,
      is_active: true,
    });
    return data;
  },
  async setStaffActive(userId: string | number, isActive: boolean) {
    requireApi();
    const { data } = await apiClient.patch<StaffRecord>(`/users/${userId}/`, { is_active: isActive });
    return data;
  },
  async requestNoteAnalysis(patientId: string, noteId: string) {
    requireApi();
    const { data } = await apiClient.post<{ job_id: string; status: string }>("/analysis/request/", { patient: patientId, note: noteId, context_limit: 10 });
    return data;
  },
  async getAnalysisJob(jobId: string) {
    const { data } = await apiClient.get<{ status: string; error_code: string; analysis_id: string | null }>(`/analysis/jobs/${jobId}/`);
    return data;
  },
  async createPatient(input: { displayName: string; internalCode: string }) {
    requireApi();
    const { data } = await apiClient.post<ApiPatient>("/patients/", { display_name: input.displayName.trim(), internal_code: input.internalCode.trim() });
    return mapPatient(data);
  },
  async getSessions(patientId: string) {
    requireApi();
    return (await getCollection<ApiSession>("/sessions/", { patient: patientId })).map(mapSession);
  },
  async createSession(input: { patientId: string; date: string; time: string; summary: string }) {
    requireApi();
    const scheduledAt = new Date(`${input.date}T${input.time}:00`);
    if (!Number.isFinite(scheduledAt.getTime())) throw new Error("Informe data e horário válidos.");
    const { data } = await apiClient.post<ApiSession>("/sessions/", { patient: input.patientId, scheduled_at: scheduledAt.toISOString(), summary: input.summary.trim() });
    return mapSession(data);
  },
  async rescheduleSession(input: { id: string; date: string; time: string; summary?: string }) {
    requireApi();
    const scheduledAt = new Date(`${input.date}T${input.time}:00`);
    if (!Number.isFinite(scheduledAt.getTime())) throw new Error("Informe nova data e horário válidos.");
    const { data } = await apiClient.patch<ApiSession>(`/sessions/${input.id}/`, {
      scheduled_at: scheduledAt.toISOString(),
      ...(input.summary !== undefined ? { summary: input.summary.trim() } : {}),
    });
    return mapSession(data);
  },
  async updateSessionStatus(id: string, status: "COMPLETED" | "CANCELLED" | "MISSED") {
    requireApi();
    const { data } = await apiClient.patch<ApiSession>(`/sessions/${id}/`, { status });
    return mapSession(data);
  },
  async getNotes(patientId: string, sessionId?: string) {
    requireApi();
    return getCollection<ClinicalNoteRecord>("/clinical-notes/", { patient: patientId, ...(sessionId ? { session: sessionId } : {}) });
  },
  async saveNote(input: { patientId: string; sessionId: string; noteId?: string; expectedVersion?: number; content: string }) {
    requireApi();
    const response = input.noteId
      ? await apiClient.patch<ClinicalNoteRecord>(`/clinical-notes/${input.noteId}/`, { raw_text: input.content, ...(input.expectedVersion ? { expected_version: input.expectedVersion } : {}) })
      : await apiClient.post<ClinicalNoteRecord>("/clinical-notes/", { patient: input.patientId, session: input.sessionId, raw_text: input.content });
    return response.data;
  },
  async submitNoteReview(noteId: string) {
    requireApi();
    const { data } = await apiClient.post<ClinicalNoteRecord>(`/clinical-notes/${noteId}/submit-review/`);
    return data;
  },
  async getNoteHistory(noteId: string) {
    requireApi();
    const { data } = await apiClient.get<ClinicalNoteHistoryRecord[]>(`/clinical-notes/${noteId}/history/`);
    return data;
  },
};
