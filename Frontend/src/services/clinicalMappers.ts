import type { AIAnalysis, Patient, TherapySession } from "@/types/clinical";

export interface PaginatedResponse<T> {
  results: T[];
}

export interface ApiPatient {
  id: string;
  internal_code: string;
  display_name: string;
  status: "ACTIVE" | "ARCHIVED" | "INACTIVE";
  created_at: string;
  updated_at: string;
}

export interface ApiSession {
  id: string;
  patient: string;
  professional?: string | number;
  scheduled_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MISSED";
  summary: string;
}

export interface ApiAnalysis {
  id: string;
  patient: string;
  status: "PENDING_REVIEW" | "VALIDATED" | "REJECTED";
  patterns: string[];
  longitudinal_evolution: string;
  attention_points: string[];
  longitudinal_coherence: string;
  relevance_score: number | string | null;
  behavioral_changes?: string[];
  possible_inconsistencies?: string[];
  sentiment_metrics?: Array<{ label: string; value: number | string }>;
  created_at?: string;
  sources: Array<{ excerpt: string }>;
}

export interface ApiAuditEvent {
  id: string;
  user: string | number | null;
  action: string;
  entity: string;
  ip_address: string;
  created_at: string;
}

const SESSION_STATUS_LABELS = { SCHEDULED: "agendada", COMPLETED: "concluída", CANCELLED: "cancelada", MISSED: "com falta" } as const;

export function unwrap<T>(data: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

export function mapPatient(patient: ApiPatient): Patient {
  return {
    id: patient.id,
    name: patient.display_name,
    age: null,
    status: patient.status === "INACTIVE" || patient.status === "ARCHIVED" ? "inactive" : "active",
    treatmentDuration: "Não informado",
    sessionFrequency: "Não informada",
    lastSession: "-",
    nextSession: "-",
    therapist: "Não informado",
    tags: [patient.internal_code],
  };
}

export function mapSession(session: ApiSession): TherapySession {
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : null;
  const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : null;
  return {
    id: session.id,
    patientId: session.patient,
    professionalId: session.professional == null ? undefined : String(session.professional),
    patientName: undefined,
    date: new Date(session.scheduled_at).toLocaleDateString("pt-BR"),
    duration: startedAt && endedAt ? Math.max(0, Math.round((endedAt - startedAt) / 60000)) : null,
    status: session.status === "COMPLETED" ? "completed" : session.status === "SCHEDULED" ? "draft" : session.status === "CANCELLED" ? "cancelled" : "missed",
    title: `Sessão ${SESSION_STATUS_LABELS[session.status]}`,
    summary: session.summary || "Sem resumo registrado.",
    narrative: session.summary || "",
    complement: session.summary || "",
  };
}

export function mapAnalysis(analysis: ApiAnalysis): AIAnalysis {
  const score = analysis.relevance_score == null || analysis.relevance_score === "" ? null : Number(analysis.relevance_score);
  const metric = (label: string) => {
    const value = analysis.sentiment_metrics?.find((item) => item.label === label)?.value;
    if (value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  return {
    id: analysis.id,
    patientId: analysis.patient,
    status: analysis.status === "VALIDATED" ? "validated" : analysis.status === "REJECTED" ? "rejected" : "pending",
    relevanceScore: score !== null && Number.isFinite(score) ? (score <= 1 ? score * 100 : score) : null,
    moodScore: metric("mood"),
    emotionalStateScore: metric("emotional_state"),
    psychologicalBurdenScore: metric("psychological_burden"),
    patterns: analysis.patterns ?? [],
    documentaryInconsistencies: analysis.possible_inconsistencies ?? [],
    considerations: analysis.behavioral_changes ?? [],
    longitudinalEvolution: analysis.longitudinal_evolution ?? "",
    attentionPoints: analysis.attention_points ?? [],
    narrativeCoherence: null,
    sources: analysis.sources?.map((source) => source.excerpt) ?? [],
    ...(analysis.created_at ? { createdAt: analysis.created_at } : {}),
    signals: (analysis.sentiment_metrics ?? []).flatMap((item) => {
      const value = Number(item.value);
      return Number.isFinite(value) ? [{ label: item.label, value }] : [];
    }),
  };
}
