export type PatientStatus = "active" | "watch" | "inactive";
export type SessionStatus = "draft" | "completed" | "needs_review";
export type AnalysisStatus = "pending" | "validated" | "rejected";

export interface Patient {
  id: string;
  name: string;
  age: number;
  status: PatientStatus;
  treatmentDuration: string;
  sessionFrequency: "Semanal" | "Quinzenal" | "Mensal";
  lastSession: string;
  nextSession: string;
  riskLevel: "baixo" | "moderado" | "atenção" | "não avaliado";
  therapist: string;
  tags: string[];
}

export interface TherapySession {
  id: string;
  patientId: string;
  patientName?: string;
  date: string;
  duration: number;
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
  relevanceScore: number;
  moodScore: number;
  emotionalStateScore: number;
  psychologicalBurdenScore: number;
  patterns: string[];
  riskScenarios: string[];
  considerations: string[];
  longitudinalEvolution: string;
  attentionPoints: string[];
  narrativeCoherence: number;
  sources: string[];
}

export interface AuditEvent {
  id: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  date: string;
  ip: string;
}

export interface PatientNote {
  id: string;
  patientId: string;
  sessionId?: string;
  date: string;
  title: string;
  content: string;
  complement?: string;
  attentionIndex: number;
}

export interface PatientLongitudinalMetric {
  month: string;
  patientId: string;
  anxiety: number;
  adherence: number;
  narrative: number;
  attention: number;
  mood: number;
  emotionalState: number;
  psychologicalBurden: number;
  sessions: number;
}

export interface AgendaItem {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  status: SessionStatus;
  complement: string;
  attentionIndex: number;
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
