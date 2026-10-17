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

interface PaginatedResponse<T> {
  results: T[];
}

interface ApiPatient {
  id: string;
  internal_code: string;
  display_name: string;
  status: "ACTIVE" | "ARCHIVED" | "INACTIVE";
  created_at: string;
  updated_at: string;
}

interface ApiSession {
  id: string;
  patient: string;
  scheduled_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MISSED";
  summary: string;
}

interface ApiAnalysis {
  id: string;
  patient: string;
  status: "PENDING" | "PROCESSING" | "VALIDATED" | "REJECTED" | "FAILED";
  patterns: string[];
  longitudinal_evolution: string;
  attention_points: string[];
  longitudinal_coherence: number | null;
  relevance_score: number | null;
  behavioral_changes?: string[];
  possible_inconsistencies?: string[];
  sentiment_metrics?: Array<{ label: string; value: number }>;
  sources: Array<{ excerpt: string }>;
}

interface ApiAuditEvent {
  id: string;
  user: string | number | null;
  action: string;
  entity: string;
  ip_address: string;
  created_at: string;
}

interface AnalysisRequestPayload {
  patientId: string;
  sessionId?: string;
  content: string;
}

function unwrap<T>(data: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

function mapPatient(patient: ApiPatient): Patient {
  return {
    id: patient.id,
    name: patient.display_name,
    age: 0,
    status: patient.status === "INACTIVE" || patient.status === "ARCHIVED" ? "inactive" : "active",
    treatmentDuration: "Em acompanhamento",
    sessionFrequency: "Semanal",
    lastSession: "-",
    nextSession: "-",
    riskLevel: "baixo",
    therapist: "Equipe clínica",
    tags: [patient.internal_code],
  };
}

function mapSession(session: ApiSession): TherapySession {
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : null;
  const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : null;
  return {
    id: session.id,
    patientId: session.patient,
    patientName: undefined,
    date: new Date(session.scheduled_at).toLocaleDateString("pt-BR"),
    duration: startedAt && endedAt ? Math.max(0, Math.round((endedAt - startedAt) / 60000)) : 50,
    status: session.status === "COMPLETED" ? "completed" : session.status === "SCHEDULED" ? "draft" : "needs_review",
    title: `Sessão ${session.status.toLowerCase()}`,
    summary: session.summary || "Sem resumo registrado.",
    narrative: session.summary || "",
    complement: session.summary || "",
  };
}

function mapAnalysis(analysis: ApiAnalysis): AIAnalysis {
  return {
    id: analysis.id,
    patientId: analysis.patient,
    status: analysis.status === "VALIDATED" ? "validated" : analysis.status === "REJECTED" ? "rejected" : "pending",
    relevanceScore: analysis.relevance_score ?? 0,
    moodScore: analysis.sentiment_metrics?.find?.((metric: { label: string }) => metric.label === "mood")?.value ?? 0,
    emotionalStateScore: analysis.sentiment_metrics?.find?.((metric: { label: string }) => metric.label === "emotional_state")?.value ?? 0,
    psychologicalBurdenScore: analysis.sentiment_metrics?.find?.((metric: { label: string }) => metric.label === "psychological_burden")?.value ?? 0,
    patterns: analysis.patterns ?? [],
    riskScenarios: analysis.possible_inconsistencies ?? [],
    considerations: analysis.behavioral_changes ?? [],
    longitudinalEvolution: analysis.longitudinal_evolution ?? "",
    attentionPoints: analysis.attention_points ?? [],
    narrativeCoherence: analysis.longitudinal_coherence ?? 0,
    sources: analysis.sources?.map((source) => source.excerpt) ?? [],
  };
}

export const clinicalService = {
  async getDashboard(): Promise<DashboardData> {
    if (import.meta.env.VITE_USE_API === "true") {
      const [patientsResponse, sessionsResponse, analysesResponse, auditResponse] = await Promise.allSettled([
        apiClient.get<ApiPatient[] | PaginatedResponse<ApiPatient>>("/patients/"),
        apiClient.get<ApiSession[] | PaginatedResponse<ApiSession>>("/sessions/"),
        apiClient.get<ApiAnalysis[] | PaginatedResponse<ApiAnalysis>>("/analysis/"),
        apiClient.get<ApiAuditEvent[] | PaginatedResponse<ApiAuditEvent>>("/audit-logs/"),
      ]);
      return {
        patients: patientsResponse.status === "fulfilled" ? unwrap(patientsResponse.value.data).map(mapPatient) : [],
        sessions: sessionsResponse.status === "fulfilled" ? unwrap(sessionsResponse.value.data).map(mapSession) : [],
        analyses: analysesResponse.status === "fulfilled" ? unwrap(analysesResponse.value.data).map(mapAnalysis) : [],
        longitudinalData: [],
        auditEvents: auditResponse.status === "fulfilled"
          ? unwrap(auditResponse.value.data).map((event) => ({
            id: event.id,
            actor: String(event.user ?? "Sistema"),
            role: "-",
            action: event.action,
            entity: event.entity,
            date: new Date(event.created_at).toLocaleString("pt-BR"),
            ip: event.ip_address,
          }))
          : [],
      };
    }
    return { patients, sessions, analyses, longitudinalData, auditEvents };
  },
  async getPatients(): Promise<Patient[]> {
    if (import.meta.env.VITE_USE_API === "true") {
      const { data } = await apiClient.get<ApiPatient[] | PaginatedResponse<ApiPatient>>("/patients/");
      return unwrap(data).map(mapPatient);
    }
    return patients;
  },
  async getPatient(id: string): Promise<{ patient: Patient; sessions: TherapySession[]; analyses: AIAnalysis[] }> {
    if (import.meta.env.VITE_USE_API === "true") {
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
  async requestAnalysis(note: string): Promise<AIAnalysis> {
    if (import.meta.env.VITE_USE_API === "true") {
      const availablePatients = await this.getPatients();
      const patient = availablePatients[0];
      if (!patient) {
        throw new Error("Cadastre um paciente antes de solicitar análise assistiva.");
      }
      return this.requestPatientAnalysis({ patientId: patient.id, content: note });
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    return analyses[0];
  },
  async requestPatientAnalysis(payload: AnalysisRequestPayload): Promise<AIAnalysis> {
    if (import.meta.env.VITE_USE_API === "true") {
      const noteResponse = await apiClient.post<{ id: string }>("/clinical-notes/", {
        patient: payload.patientId,
        session: payload.sessionId,
        raw_text: payload.content,
      });
      const { data } = await apiClient.post<ApiAnalysis>("/analysis/request/", {
        patient: payload.patientId,
        note: noteResponse.data.id,
        context_limit: 10,
      });
      return mapAnalysis(data);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    return analyses.find((analysis) => analysis.patientId === payload.patientId) ?? analyses[0];
  },
  async getPatientNotes(patientId: string): Promise<PatientNote[]> {
    if (import.meta.env.VITE_USE_API === "true") {
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
        attentionIndex: 0,
      }));
    }
    return patientNotes.filter((note) => note.patientId === patientId);
  },
  async getPatientLongitudinal(patientId: string): Promise<PatientLongitudinalMetric[]> {
    if (import.meta.env.VITE_USE_API === "true") {
      // The API does not yet publish validated per-session longitudinal metrics.
      // Show an empty state rather than inventing measurements from relevance.
      return [];
    }
    return patientLongitudinalData.filter((item) => item.patientId === patientId);
  },
  async getAgenda(): Promise<AgendaItem[]> {
    if (import.meta.env.VITE_USE_API === "true") {
      const [patientsData, sessionsData, analysesData] = await Promise.all([
        this.getPatients(),
        apiClient.get<ApiSession[] | PaginatedResponse<ApiSession>>("/sessions/"),
        apiClient.get<ApiAnalysis[] | PaginatedResponse<ApiAnalysis>>("/analysis/"),
      ]);
      const apiSessions = unwrap(sessionsData.data);
      const mappedSessions = apiSessions.map(mapSession);
      const mappedAnalyses = unwrap(analysesData.data).map(mapAnalysis);
      return mappedSessions.map((session, index) => {
        const scheduledAt = apiSessions[index]?.scheduled_at ?? "";
        const patient = patientsData.find((item) => item.id === session.patientId);
        const attentionIndex = mappedAnalyses
          .filter((analysis) => analysis.patientId === session.patientId)
          .reduce((max, analysis) => Math.max(max, analysis.relevanceScore), 0);
        return {
          id: session.id,
          patientId: session.patientId,
          patientName: patient?.name ?? "Paciente",
          date: scheduledAt.slice(0, 10) || session.date,
          time: scheduledAt.slice(11, 16) || "08:00",
          status: session.status,
          complement: session.complement || session.summary,
          attentionIndex,
        };
      });
    }
    return agendaItems;
  },
  async getFinance(): Promise<FinancialRecord[]> {
    return financialRecords;
  },
};
