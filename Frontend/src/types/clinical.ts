export type PatientStatus = "active" | "inactive";
export type SessionStatus = "draft" | "completed" | "needs_review" | "cancelled" | "missed" | "in_progress";
export type AnalysisStatus = "pending" | "validated" | "rejected";

export interface Patient {
  id: string;
  name: string;
  age: number | null;
  status: PatientStatus;
  treatmentDuration: string;
  sessionFrequency: "Semanal" | "Quinzenal" | "Mensal" | "Não informada";
  lastSession: string;
  nextSession: string;
  therapist: string;
  tags: string[];
}

export interface TherapySession {
  id: string;
  patientId: string;
  professionalId?: string;
  patientName?: string;
  date: string;
  duration: number | null;
  status: SessionStatus;
  title: string;
  summary: string;
  narrative: string;
  complement?: string;
}

export interface AIAnalysis {
  id: string;
  patientId: string;
  status: AnalysisStatus;
  relevanceScore: number | null;
  moodScore: number | null;
  emotionalStateScore: number | null;
  psychologicalBurdenScore: number | null;
  patterns: string[];
  documentaryInconsistencies: string[];
  considerations: string[];
  longitudinalEvolution: string;
  attentionPoints: string[];
  narrativeCoherence: number | null;
  sources: string[];
  createdAt?: string;
  signals?: Array<{ label: string; value: number }>;
}

export interface AuditEvent {
  id: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  date: string;
  ip: string;
  sha256?: string;
  payload?: Record<string, unknown> | string;
  category?: string;
}

export interface PatientNote {
  id: string;
  patientId: string;
  sessionId?: string;
  date: string;
  title: string;
  content: string;
  complement?: string;
}

export interface PatientLongitudinalMetric {
  month: string;
  patientId: string;
  anxiety: number;
  adherence: number;
  narrative: number;
  mood: number;
  emotionalState: number;
  psychologicalBurden: number;
  sessions: number;
}

export interface AgendaItem {
  id: string;
  patientId: string;
  professionalId?: string;
  patientName: string;
  date: string;
  time: string;
  status: SessionStatus;
  complement: string;
}

export interface FinancialRecord {
  id: string;
  psychologist: string;
  patientName: string;
  date: string;
  sessionValue: number;
  platformFee: number;
  netValue: number;
  status: "paid" | "pending" | "overdue";
}
