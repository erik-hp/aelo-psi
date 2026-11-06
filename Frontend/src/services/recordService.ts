import { apiClient } from "@/api/client";
import { getCollection } from "@/api/collections";
import { isApiMode } from "./runtime";
import { mapPatient, mapSession, type ApiPatient, type ApiSession } from "./clinicalMappers";

export interface ClinicalNoteRecord {
  id: string; patient: string; session: string | null; author: string | number;
  raw_text: string; version: number; locked_at: string | null;
}

export interface StaffRecord { id: string | number; username: string; email: string; first_name: string; last_name: string; role: string; is_active: boolean }

function requireApi() { if (!isApiMode) throw new Error("Esta operação exige conexão com a API. A demonstração não salva registros."); }

export const recordService = {
  async canEditPatient(patientId: string, userId: string) {
    requireApi();
    const grants = await getCollection<{ user: string | number; can_edit: boolean }>(`/patients/${patientId}/access-grants/`);
    return grants.some((grant) => String(grant.user) === userId && grant.can_edit);
  },
  async getUsers() { requireApi(); return getCollection<StaffRecord>("/users/"); },
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
};
