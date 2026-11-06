import { Link } from "react-router-dom";
import { CalendarDays, Clock, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AIAnalysis, Patient } from "@/types/clinical";

interface PatientCardProps {
  patient: Patient;
  completedSessions?: number;
  scheduledSessions?: number;
  analysis?: AIAnalysis;
}

export function PatientCard({ patient, completedSessions = 0, scheduledSessions = 0, analysis }: PatientCardProps) {
  return (
    <Link to={`/patients/${patient.id}`} className="focus-ring block rounded-lg">
      <Card className="transition hover:border-border-focus-ring">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 break-words">
              <h3 className="text-body-semibold">{patient.name}</h3>
              <p className="mt-1 text-body-regular text-text-secondary">{patient.age === null ? "Idade não informada" : `${patient.age} anos`} • {patient.therapist}</p>
            </div>
            <Badge variant={patient.riskLevel === "atenção" ? "warning" : patient.riskLevel === "não avaliado" ? "muted" : patient.status === "active" ? "success" : "muted"}>
              {patient.riskLevel}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 text-body-regular md:grid-cols-2">
            <div className="rounded-md border border-border-button-default bg-background-secondary-default p-3">
              <p className="text-caption-1-regular text-text-secondary">Tratamento</p>
              <p className="mt-1 text-body-medium">{patient.treatmentDuration}</p>
            </div>
            <div className="rounded-md border border-border-button-default bg-background-secondary-default p-3">
              <p className="text-caption-1-regular text-text-secondary">Periodicidade</p>
              <p className="mt-1 text-body-medium">{patient.sessionFrequency}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-body-regular text-text-secondary">
            <CalendarDays className="h-4 w-4" />
            Próxima sessão: {patient.nextSession}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-caption-1-regular">
            <span className="inline-flex items-center gap-1 rounded-md border border-border-button-default px-2 py-1 text-text-secondary">
              <FileCheck2 className="h-3.5 w-3.5" />
              {completedSessions} realizadas
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border-button-default px-2 py-1 text-text-secondary">
              <Clock className="h-3.5 w-3.5" />
              {scheduledSessions} agendadas
            </span>
            {analysis?.psychologicalBurdenScore !== null && analysis?.psychologicalBurdenScore !== undefined ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-status-yellow-text px-2 py-1 text-status-yellow-text">
                Carga {analysis.psychologicalBurdenScore}%
              </span>
            ) : null}
          </div>
          {analysis ? (
            <p className="mt-4 text-body-regular text-text-secondary">
              {analysis.considerations[0] ?? analysis.attentionPoints[0] ?? "Sem observações pendentes."}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {patient.tags.map((tag) => <Badge key={tag} variant="muted">{tag}</Badge>)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
