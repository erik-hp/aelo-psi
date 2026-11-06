import { apiClient } from "@/api/client";
import {
  agendaItems,
  auditEvents,
  financialRecords,
  patients,
  patientLongitudinalData,
  patientNotes,
  sessions,
  analyses,
  longitudinalData,
} from "@/services/mockData";
import { isApiMode } from "@/services/runtime";
import { vaultGraphSchema, vaultCheckpointDetailSchema } from "@/schemas/vault";
import type { VaultGraph } from "@/types/vault";
import { mockVaultGraph } from "@/services/mockVault";
import { mapAnalysis, mapPatient, mapSession, unwrap } from "@/services/clinicalMappers";
import type { ApiAnalysis, ApiAuditEvent, ApiPatient, ApiSession, PaginatedResponse } from "@/services/clinicalMappers";
import type {
  AgendaItem,
  AIAnalysis,
  FinancialRecord,
  Patient,
  PatientLongitudinalMetric,
  PatientNote,
  TherapySession,
} from "@/types/clinical";

interface DashboardData {
  patients: Patient[];
  sessions: TherapySession[];
  analyses: AIAnalysis[];
  longitudinalData: typeof longitudinalData;
  auditEvents: typeof auditEvents;
}

interface AnalysisRequestPayload {
  patientId: string;
  sessionId?: string;
  content: string;
}


export const clinicalService = {
  async previewAiText(patientId: string, text: string): Promise<string> {
    if (!isApiMode) return text;
    const { data } = await apiClient.post<{ prepared_text: string }>("/clinical-notes/preview-ai/", { patient: patientId, text });
    return data.prepared_text;
  },
  async getPatientVault(patientId: string): Promise<VaultGraph> {
    if (!isApiMode) return mockVaultGraph;
    const { data } = await apiClient.get<VaultGraph>(`/vault/patients/${patientId}/`);
    return vaultGraphSchema.parse(data);
  },
  async createVaultCheckpoint(analysisId: string): Promise<void> {
    if (!isApiMode) return;
    const { data } = await apiClient.post<{ job_id: string; status: string }>(`/vault/analyses/${analysisId}/checkpoint/`);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const result = await apiClient.get<{ status: string; error_code: string }>(`/vault/jobs/${data.job_id}/`);
      if (result.data.status === "COMPLETED") return;
      if (result.data.status === "FAILED") throw new Error(`Falha no processamento: ${result.data.error_code}`);
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }
    throw new Error("O processamento excedeu o tempo de acompanhamento. Consulte o Vault novamente.");
  },
  async getVaultCheckpoint(checkpointId: string): Promise<string> {
    if (!isApiMode) return `# Checkpoint sintético\n\nEste relatório contém apenas dados demonstrativos.\n\n- Checkpoint: ${checkpointId}`;
    const { data } = await apiClient.get(`/vault/checkpoints/${checkpointId}/`);
    return vaultCheckpointDetailSchema.parse(data).markdown;
  },
  async downloadVaultCheckpoint(checkpointId: string): Promise<void> {
    if (!isApiMode) return;
    const { data } = await apiClient.get<Blob>(`/vault/checkpoints/${checkpointId}/`, { params: { download: 1 }, responseType: "blob" });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aelo-checkpoint-${checkpointId}.md`;
    link.click();
    URL.revokeObjectURL(url);
  },
  async getDashboard(): Promise<DashboardData> {
    if (isApiMode) {
      const [patientsResponse, sessionsResponse, analysesResponse] = await Promise.all([
        apiClient.get<ApiPatient[] | PaginatedResponse<ApiPatient>>("/patients/"),
        apiClient.get<ApiSession[] | PaginatedResponse<ApiSession>>("/sessions/"),
        apiClient.get<ApiAnalysis[] | PaginatedResponse<ApiAnalysis>>("/analysis/"),
      ]);
      return {
        patients: unwrap(patientsResponse.data).map(mapPatient),
        sessions: unwrap(sessionsResponse.data).map(mapSession),
        analyses: unwrap(analysesResponse.data).map(mapAnalysis),
        longitudinalData: [],
        auditEvents: [],
      };
    }
    return { patients, sessions, analyses, longitudinalData, auditEvents };
  },
  async getPatients(): Promise<Patient[]> {
    if (isApiMode) {
      const { data } = await apiClient.get<ApiPatient[] | PaginatedResponse<ApiPatient>>("/patients/");
      return unwrap(data).map(mapPatient);
    }
    return patients;
  },
  async getPatient(id: string): Promise<{ patient: Patient; sessions: TherapySession[]; analyses: AIAnalysis[] }> {
    if (isApiMode) {
      const [patientResponse, sessionsResponse, analysesResponse] = await Promise.all([
        apiClient.get<ApiPatient>(`/patients/${id}/`),
        apiClient.get<ApiSession[] | PaginatedResponse<ApiSession>>("/sessions/", { params: { patient: id } }),
        apiClient.get<ApiAnalysis[] | PaginatedResponse<ApiAnalysis>>("/analysis/", { params: { patient: id } }),
      ]);
      return {
        patient: mapPatient(patientResponse.data),
        sessions: unwrap(sessionsResponse.data).map(mapSession),
        analyses: unwrap(analysesResponse.data).map(mapAnalysis),
      };
    }
    const patient = patients.find((item) => item.id === id) ?? patients[0];
    return {
      patient,
      sessions: sessions.filter((item) => item.patientId === patient.id),
      analyses: analyses.filter((item) => item.patientId === patient.id),
    };
  },
  async requestAnalysis(_note: string): Promise<AIAnalysis> {
    if (isApiMode) {
      throw new Error("Selecione o paciente no perfil antes de solicitar a análise.");
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    return analyses[0];
  },
  async requestPatientAnalysis(payload: AnalysisRequestPayload): Promise<AIAnalysis> {
    if (isApiMode) {
      await apiClient.post("/clinical-notes/preview-ai/", { patient: payload.patientId, text: payload.content });
      const noteResponse = await apiClient.post<{ id: string }>("/clinical-notes/", {
        patient: payload.patientId,
        session: payload.sessionId,
        raw_text: payload.content,
      });
      const { data } = await apiClient.post<{ job_id: string }>("/analysis/request/", {
        patient: payload.patientId,
        note: noteResponse.data.id,
        context_limit: 10,
      }, { timeout: 45_000 });
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const result = await apiClient.get<{ status: string; analysis_id: string | null; error_code: string }>(`/analysis/jobs/${data.job_id}/`);
        if (result.data.status === "COMPLETED" && result.data.analysis_id) {
          const analysis = await apiClient.get<ApiAnalysis>(`/analysis/${result.data.analysis_id}/`);
          return mapAnalysis(analysis.data);
        }
        if (result.data.status === "FAILED") throw new Error(`Falha na análise: ${result.data.error_code}`);
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }
      throw new Error("A análise continua em processamento. Atualize o perfil para conferir o resultado.");
    }
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    return analyses.find((analysis) => analysis.patientId === payload.patientId) ?? analyses[0];
  },
  async getPatientNotes(patientId: string): Promise<PatientNote[]> {
    if (isApiMode) {
      const { data } = await apiClient.get<Array<{
        id: string;
        patient: string;
        session?: string | null;
        raw_text: string;
        anonymized_text: string;
        created_at: string;
      }> | PaginatedResponse<{
        id: string;
        patient: string;
        session?: string | null;
        raw_text: string;
        anonymized_text: string;
        created_at: string;
      }>>("/clinical-notes/", { params: { patient: patientId } });
      return unwrap(data).map((note) => ({
        id: note.id,
        patientId: note.patient,
        sessionId: note.session ?? undefined,
        date: new Date(note.created_at).toLocaleDateString("pt-BR"),
        title: "Prontuário da sessão",
        content: note.anonymized_text || note.raw_text,
        complement: "Complemento pendente de revisão clínica.",
        attentionIndex: null,
      }));
    }
    return patientNotes.filter((note) => note.patientId === patientId);
  },
  async getPatientLongitudinal(patientId: string): Promise<PatientLongitudinalMetric[]> {
    if (isApiMode) {
      return [];
    }
    return patientLongitudinalData.filter((item) => item.patientId === patientId);
  },
  async getAgenda(): Promise<AgendaItem[]> {
    if (isApiMode) {
      const [patientsData, sessionsData] = await Promise.all([
        clinicalService.getPatients(),
        apiClient.get<ApiSession[] | PaginatedResponse<ApiSession>>("/sessions/"),
      ]);
      const apiSessions = unwrap(sessionsData.data);
      const mappedSessions = apiSessions.map(mapSession);
      return mappedSessions.map((session, index) => {
        const scheduledAt = apiSessions[index]?.scheduled_at ?? "";
        const patient = patientsData.find((item) => item.id === session.patientId);
        return {
          id: session.id,
          patientId: session.patientId,
          patientName: patient?.name ?? "Paciente",
          date: scheduledAt.slice(0, 10) || session.date,
          time: scheduledAt.slice(11, 16) || "08:00",
          status: session.status,
          complement: session.complement || session.summary,
          attentionIndex: null,
        };
      });
    }
    return agendaItems;
  },
  async getFinance(): Promise<FinancialRecord[]> {
    return isApiMode ? [] : financialRecords;
  },
  async getAuditEvents() {
    if (!isApiMode) return auditEvents;
    const { data } = await apiClient.get<ApiAuditEvent[] | PaginatedResponse<ApiAuditEvent>>("/audit-logs/");
    return unwrap(data).map((event) => {
      const anyEvent = event as unknown as Record<string, unknown>;
      return {
        id: event.id,
        actor: String(event.user ?? "Sistema"),
        role: String(anyEvent.role || anyEvent.user_role || "PSYCHOLOGIST"),
        action: event.action,
        entity: event.entity,
        date: new Date(event.created_at).toLocaleString("pt-BR"),
        ip: event.ip_address,
        sha256: typeof anyEvent.sha256 === "string" ? anyEvent.sha256 : typeof anyEvent.hash_sha256 === "string" ? anyEvent.hash_sha256 : undefined,
        payload: (anyEvent.payload || anyEvent.details) as Record<string, unknown> | undefined,
      };
    });
  },
};
