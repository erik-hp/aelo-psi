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
      <Card className="transition hover:border-primary/40">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">{patient.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{patient.age === null ? "Idade não informada" : `${patient.age} anos`} • {patient.therapist}</p>
            </div>
            <Badge variant={patient.riskLevel === "atenção" ? "warning" : patient.riskLevel === "não avaliado" ? "muted" : patient.status === "active" ? "success" : "muted"}>
              {patient.riskLevel}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">Tratamento</p>
              <p className="mt-1 font-medium">{patient.treatmentDuration}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">Periodicidade</p>
              <p className="mt-1 font-medium">{patient.sessionFrequency}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Próxima sessão: {patient.nextSession}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground">
              <FileCheck2 className="h-3.5 w-3.5" />
              {completedSessions} realizadas
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {scheduledSessions} agendadas
            </span>
            {analysis?.psychologicalBurdenScore !== null && analysis?.psychologicalBurdenScore !== undefined ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 px-2 py-1 text-amber-300">
                Carga {analysis.psychologicalBurdenScore}%
              </span>
            ) : null}
          </div>
          {analysis ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
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
