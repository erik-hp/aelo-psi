import { RiArrowRightSLine } from "@remixicon/react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { AIAnalysis, Patient } from "@/types/clinical";

interface PatientCardProps {
  patient: Patient;
  completedSessions?: number;
  scheduledSessions?: number;
  analysis?: AIAnalysis;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function PatientCard({ patient, completedSessions = 0, scheduledSessions = 0, analysis }: PatientCardProps) {
  const burden = analysis?.psychologicalBurdenScore;
  const note = analysis ? analysis.considerations[0] ?? analysis.attentionPoints[0] ?? "Sem observações pendentes." : null;
  return (
    <Link to={`/patients/${patient.id}`} className="focus-ring group flex min-h-16 items-start gap-4 p-4 transition-colors hover:bg-background-primary-hover md:p-5">
      <span aria-hidden="true" className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-full bg-[var(--aelo-accent-soft)] aelo-display text-lg text-[var(--aelo-thread)]">
        {initials(patient.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="aelo-display break-words text-xl">{patient.name}</h3>
          <Badge variant={patient.status === "active" ? "success" : "muted"}>
            {patient.status === "inactive" ? "Cadastro inativo" : "Cadastro ativo"}
          </Badge>
        </div>
        <p className="mt-0.5 text-body-regular text-text-secondary">
          {patient.age === null ? "Idade não informada" : `${patient.age} anos`}, {patient.therapist}
        </p>
        <p className="mt-2 text-body-regular">
          <span className="text-text-secondary">Próxima sessão: </span>
          <span className="font-medium">{patient.nextSession}</span>
        </p>
        <p className="mt-0.5 text-body-regular tabular-nums text-text-secondary">
          {patient.treatmentDuration}, {patient.sessionFrequency}. {completedSessions} realizadas, {scheduledSessions} agendadas
          {burden !== null && burden !== undefined ? `. Carga ${burden}%` : ""}
        </p>
        {note ? <p className="aelo-record mt-2 line-clamp-2 text-text-secondary">{note}</p> : null}
        {patient.tags.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {patient.tags.map((tag) => <Badge key={tag} variant="muted">{tag}</Badge>)}
          </div>
        ) : null}
      </div>
      <RiArrowRightSLine aria-hidden="true" className="mt-3 size-5 shrink-0 text-text-secondary transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
