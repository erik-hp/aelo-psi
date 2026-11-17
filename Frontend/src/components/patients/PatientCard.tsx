import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { AIAnalysis, Patient } from "@/types/clinical";

interface PatientCardProps {
  patient: Patient;
  completedSessions?: number;
  scheduledSessions?: number;
  analysis?: AIAnalysis;
}

export function PatientCard({ patient, completedSessions = 0, scheduledSessions = 0, analysis }: PatientCardProps) {
  const burden = analysis?.psychologicalBurdenScore;
  const note = analysis ? analysis.considerations[0] ?? analysis.attentionPoints[0] ?? "Sem observações pendentes." : null;
  return (
    <Link to={`/patients/${patient.id}`} className="focus-ring block p-4 transition-colors hover:bg-background-primary-hover">
      <div className="grid gap-x-6 gap-y-2 md:grid-cols-[minmax(0,1fr)_18rem_6.5rem]">
        <div className="min-w-0 break-words">
          <h3 className="text-headline-semibold">{patient.name}</h3>
          <p className="mt-0.5 text-body-regular text-text-secondary">{patient.age === null ? "Idade não informada" : `${patient.age} anos`}, {patient.therapist}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-body-regular">
          <div>
            <dt className="text-caption-1-regular text-text-secondary">Tratamento</dt>
            <dd>{patient.treatmentDuration}</dd>
          </div>
          <div>
            <dt className="text-caption-1-regular text-text-secondary">Periodicidade</dt>
            <dd>{patient.sessionFrequency}</dd>
          </div>
        </dl>
        <Badge className="justify-self-start self-start md:justify-self-end" variant={patient.status === "active" ? "success" : "muted"}>
          {patient.status === "inactive" ? "Cadastro inativo" : "Cadastro ativo"}
        </Badge>
      </div>
      <p className="mt-2 text-body-regular text-text-secondary">
        <span>Próxima sessão: {patient.nextSession}</span>
        <span className="tabular-nums">. {completedSessions} realizadas, {scheduledSessions} agendadas</span>
        {burden !== null && burden !== undefined ? <span className="tabular-nums">. Carga {burden}%</span> : null}
      </p>
      {note ? <p className="aelo-record mt-1 text-text-secondary">{note}</p> : null}
      {patient.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {patient.tags.map((tag) => <Badge key={tag} variant="muted">{tag}</Badge>)}
        </div>
      ) : null}
    </Link>
  );
}
