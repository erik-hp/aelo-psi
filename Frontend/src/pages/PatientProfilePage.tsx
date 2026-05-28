import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Brain, CalendarClock, CheckCircle2, Clock, Send } from "lucide-react";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionCard } from "@/components/sessions/SessionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { clinicalService } from "@/services/clinicalService";
import type { TherapySession } from "@/types/clinical";

function SessionAnalysisBlock({
  patientId,
  session,
}: {
  patientId: string;
  session: TherapySession;
}) {
  const { notify } = useToast();
  const [content, setContent] = useState(session.narrative || session.summary);
  const mutation = useMutation({
    mutationFn: () => clinicalService.requestPatientAnalysis({ patientId, sessionId: session.id, content }),
    onSuccess: () => notify({ type: "success", title: "Prontuário enviado", description: "A análise foi solicitada para revisão clínica." }),
    onError: () => notify({ type: "error", title: "Falha na análise", description: "Confira o texto e tente novamente." }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4 text-primary" />
          Texto para análise da sessão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          className="min-h-36"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Insira aqui o texto do prontuário que será analisado pela IA."
        />
        <div className="flex justify-end">
          <Button disabled={mutation.isPending || content.trim().length < 30} type="button" onClick={() => mutation.mutate()}>
            <Send className="h-4 w-4" />
            Enviar para análise
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PatientProfilePage() {
  const { patientId = "" } = useParams();
  const { data } = useQuery({ queryKey: ["patient", patientId], queryFn: () => clinicalService.getPatient(patientId) });
  const { data: notes = [] } = useQuery({ queryKey: ["patient-notes", patientId], queryFn: () => clinicalService.getPatientNotes(patientId) });
  const { data: metrics = [] } = useQuery({
    queryKey: ["patient-longitudinal", patientId],
    queryFn: () => clinicalService.getPatientLongitudinal(patientId),
  });
  const { data: agenda = [] } = useQuery({ queryKey: ["agenda"], queryFn: clinicalService.getAgenda });

  const patientAgenda = useMemo(() => agenda.filter((item) => item.patientId === patientId), [agenda, patientId]);

  if (!data) return null;

  const analysis = data.analyses[0];
  const completedSessions = data.sessions.filter((session) => session.status === "completed");
  const scheduledSessions = patientAgenda.filter((item) => item.status === "draft");
  const riskScenarios = analysis?.riskScenarios?.length ? analysis.riskScenarios : ["Sem cenário crítico consolidado nos prontuários analisados."];
  const considerations = analysis?.considerations?.length ? analysis.considerations : analysis?.attentionPoints ?? [];

  return (
    <>
      <PageHeader
        title={data.patient.name}
        description="Dados do paciente, sessões realizadas e agendadas, prontuários por sessão e análise clínica baseada nas notas enviadas à API."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Idade</p>
            <p className="mt-2 text-2xl font-semibold">{data.patient.age} anos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Tempo em tratamento</p>
            <p className="mt-2 text-2xl font-semibold">{data.patient.treatmentDuration}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Periodicidade</p>
            <p className="mt-2 text-2xl font-semibold">{data.patient.sessionFrequency}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Risco clínico</p>
            <div className="mt-3"><Badge variant={data.patient.riskLevel === "atenção" ? "warning" : "default"}>{data.patient.riskLevel}</Badge></div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                Sessões realizadas
              </p>
              <p className="mt-2 text-2xl font-semibold">{completedSessions.length}</p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4 text-primary" />
                Agendadas no período {data.patient.sessionFrequency.toLowerCase()}
              </p>
              <p className="mt-2 text-2xl font-semibold">{scheduledSessions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Próximas sessões</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {scheduledSessions.length ? scheduledSessions.map((item) => (
                <Badge key={item.id} variant={item.attentionIndex >= 80 ? "warning" : "muted"}>
                  <Clock className="mr-1 h-3.5 w-3.5" />
                  {item.date} às {item.time}
                </Badge>
              )) : <Badge variant="muted">Sem agendamento</Badge>}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Sessões, prontuários e análise</h2>
          {data.sessions.map((session) => (
            <div key={session.id} className="space-y-3">
              <SessionCard session={session} notes={notes.filter((note) => note.sessionId === session.id)} />
              <SessionAnalysisBlock patientId={data.patient.id} session={session} />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise dos prontuários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Humor</p>
                  <p className="mt-2 text-xl font-semibold">{analysis?.moodScore ?? 0}%</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Estado emocional</p>
                  <p className="mt-2 text-xl font-semibold">{analysis?.emotionalStateScore ?? 0}%</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Encargo psicológico</p>
                  <p className="mt-2 text-xl font-semibold">{analysis?.psychologicalBurdenScore ?? 0}%</p>
                </div>
              </div>
              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />
                  Cenários de risco
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {riskScenarios.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
              <section>
                <h3 className="text-sm font-medium">Maiores pontos a considerar</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {considerations.map((item) => <Badge key={item} variant="default">{item}</Badge>)}
                </div>
              </section>
            </CardContent>
          </Card>

          <ChartCard title="Humor" description="Indicador estimado a partir dos prontuários analisados." data={metrics} dataKey="mood" />
          <ChartCard title="Estado emocional" description="Variação do estado emocional no acompanhamento." data={metrics} dataKey="emotionalState" />
          <ChartCard title="Encargos psicológicos" description="Potenciais encargos identificados nas notas do paciente." data={metrics} dataKey="psychologicalBurden" />
        </div>
      </section>
    </>
  );
}
