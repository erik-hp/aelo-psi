import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Brain,
  Clock,
  FileText,
  Network,
  Send,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { PatientVault } from "@/components/patients/PatientVault";
import { MetricCard, MetricStrip } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionCard } from "@/components/sessions/SessionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabPanel, TabList, Tab } from "@/components/base/tabs/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { clinicalService } from "@/services/clinicalService";
import { clinicalDraftService } from "@/services/clinicalDraftService";
import { isApiMode } from "@/services/runtime";
import type { TherapySession } from "@/types/clinical";
import { PageLoading } from "@/components/ui/page-state";
import { ButtonLink } from "@/components/ui/button-link";
import { useAuth } from "@/hooks/useAuth";
import { AIAnalysisCard } from "@/components/analysis/AIAnalysisCard";
import { EmptyState } from "@/components/ui/empty-state";

function SessionAnalysisBlock({
  patientId,
  session,
}: {
  patientId: string;
  session: TherapySession;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState(session.narrative || session.summary);
  const [preview, setPreview] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const draftVersion = useRef(0);
  const lastSaved = useRef(session.narrative || session.summary);
  const saving = useRef(false);
  const savePromise = useRef<Promise<unknown> | null>(null);
  const [saveRevision, setSaveRevision] = useState(0);

  useEffect(() => {
    if (!isOpen || !isApiMode) return;
    let active = true;
    void clinicalDraftService.get(patientId).then(async (draft) => {
      const legacyKey = `draft_narrative_${patientId}`;
      const legacy = localStorage.getItem(legacyKey);
      let selected = draft;
      if (legacy) {
        let parsed: { title?: string; content?: string } | null = null;
        try { parsed = JSON.parse(legacy); } catch { localStorage.removeItem(legacyKey); }
        if (parsed && window.confirm("Importar o rascunho clínico antigo para o servidor protegido?")) {
          const title = String(parsed.title || session.title);
          const text = String(parsed.content || "");
          const version = await clinicalDraftService.put(patientId, { title, content: text, version: draft?.version ?? 0 });
          selected = { title, content: text, version };
          localStorage.removeItem(legacyKey);
        } else if (parsed) localStorage.removeItem(legacyKey);
      }
      if (active) {
        if (selected) {
          draftVersion.current = selected.version;
          lastSaved.current = selected.content;
          setContent(selected.content);
        } else {
          draftVersion.current = 0;
          lastSaved.current = session.narrative || session.summary;
        }
        setDraftReady(true);
      }
    }).catch((error) => {
      if (axios.isAxiosError(error) && [403, 404].includes(error.response?.status ?? 0)) localStorage.removeItem(`draft_narrative_${patientId}`);
      if (active) setDraftError(true);
    });
    return () => { active = false; };
  }, [isOpen, patientId, session.title, session.narrative, session.summary]);

  useEffect(() => {
    if (!isOpen || !isApiMode || !draftReady || saving.current || content === lastSaved.current) return;
    const timer = setTimeout(() => {
      saving.current = true;
      savePromise.current = clinicalDraftService.put(patientId, { title: session.title, content, version: draftVersion.current })
        .then((version) => { draftVersion.current = version; lastSaved.current = content; setDraftError(false); })
        .catch(() => setDraftError(true))
        .finally(() => { saving.current = false; savePromise.current = null; setSaveRevision((value) => value + 1); });
    }, 600);
    return () => clearTimeout(timer);
  }, [isOpen, patientId, session.title, content, draftReady, saveRevision]);

  const mutation = useMutation({
    mutationFn: () =>
      clinicalService.requestPatientAnalysis({ patientId, sessionId: session.id, content }),
    onSuccess: () => {
      if (isApiMode) {
        setDraftReady(false);
        void (async () => {
          await savePromise.current?.catch(() => undefined);
          await clinicalDraftService.remove(patientId);
        })().catch(() => setDraftError(true));
      }
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patient-notes", patientId] });
      notify({
        type: "success",
        title: "Prontuário enviado para análise",
        description: "A síntese assistiva foi solicitada e ficará disponível para supervisão clínica.",
      });
    },
    onError: () =>
      notify({
        type: "error",
        title: "Falha na análise",
        description: "Confira o texto do prontuário e tente novamente.",
      }),
  });

  return (
    <div className="rounded-lg border border-border-button-default bg-background-secondary-default p-3 transition-colors hover:border-border-focus-ring">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-caption-1-medium text-text-secondary">
          <Brain className="h-4 w-4 text-status-blue-text" />
          <span>Análise Assistiva por IA (Sessão {session.id.slice(0, 8)})</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setDraftReady(false); setPreview(null); setIsOpen((prev) => !prev); }}
          className="h-7 text-caption-1-medium text-text-primary"
        >
          {isOpen ? "Ocultar editor de análise" : "Analisar sessão com IA"}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-3 space-y-3 border-t border-border-button-default pt-3">
          <label className="text-caption-1-medium text-text-secondary" htmlFor={`analysis-text-${session.id}`}>
            Texto do prontuário para extração de entidades e síntese clínica
          </label>
          <Textarea
            id={`analysis-text-${session.id}`}
            record
            value={content}
            onChange={(event) => { setContent(event.target.value); setPreview(null); }}
            placeholder="Insira aqui o texto do prontuário que será analisado pela IA assistiva…"
          />
          {preview !== null ? <div className="rounded border p-3 text-caption-1-regular"><p>Texto preparado para a IA. Confira os identificadores antes de confirmar:</p><pre className="aelo-record mt-2 max-w-none whitespace-pre-wrap break-words">{preview}</pre></div> : null}
          <div className="flex flex-col gap-3 text-caption-1-regular text-text-secondary sm:flex-row sm:items-center sm:justify-between">
            <span>{draftError ? "Falha ao salvar o rascunho. Copie o texto antes de sair." : "Mínimo 30 caracteres para extração ontológica."}</span>
            <Button
              disabled={mutation.isPending || (isApiMode && !draftReady) || content.trim().length < 30}
              size="sm"
              type="button"
              onClick={() => {
                if (!isApiMode || preview !== null) { mutation.mutate(); return; }
                void clinicalService.previewAiText(patientId, content).then(setPreview).catch(() => notify({ type: "error", title: "Envio bloqueado", description: "Revise os identificadores da nota antes de solicitar a análise." }));
              }}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {mutation.isPending ? "Processando…" : !isApiMode ? "Enviar para análise" : preview !== null ? "Confirmar envio à IA" : "Revisar texto para IA"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PatientProfilePage() {
  const { user } = useAuth();
  const { patientId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => clinicalService.getPatient(patientId),
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["patient-notes", patientId],
    queryFn: () => clinicalService.getPatientNotes(patientId),
  });
  const { data: metrics = [] } = useQuery({
    queryKey: ["patient-longitudinal", patientId],
    queryFn: () => clinicalService.getPatientLongitudinal(patientId),
  });
  const { data: agenda = [] } = useQuery({
    queryKey: ["agenda"],
    queryFn: clinicalService.getAgenda,
  });

  const patientAgenda = useMemo(
    () => agenda.filter((item) => item.patientId === patientId),
    [agenda, patientId],
  );

  const [activeTab, setActiveTab] = useState("overview");

  const handleSelectNote = (noteId: string) => {
    setActiveTab("sessions");
    setTimeout(() => {
      const el = document.getElementById(`note-${noteId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-border-focus-ring");
        setTimeout(() => el.classList.remove("ring-2", "ring-border-focus-ring"), 2500);
      }
    }, 120);
  };

  if (isLoading) return <PageLoading label="Carregando perfil do paciente…" />;

  if (!data) {
    return (
      <p role="alert" className="text-body-regular text-text-error-primary">
        Não foi possível carregar o perfil do paciente.
      </p>
    );
  }

  const analysis = data.analyses[0];
  const completedSessions = data.sessions.filter((session) => session.status === "completed");
  const scheduledSessions = patientAgenda.filter((item) => item.status === "draft");
  const riskScenarios = analysis?.riskScenarios?.length
    ? analysis.riskScenarios
    : ["Sem cenário crítico consolidado nos prontuários analisados."];
  const considerations = analysis?.considerations?.length
    ? analysis.considerations
    : analysis?.attentionPoints ?? [];

  return (
    <>
      <PageHeader
        title={data.patient.name}
        description="Histórico de sessões, notas e análises assistivas deste paciente."
      />

      {/* Particionamento em 4 Abas Clínicas com foco e teclado acessível (WAI-ARIA) */}
      <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key))} className="mt-4 min-w-0 gap-6">
        <TabList showIndicator={false} aria-label="Seções do prontuário" className="grid w-full grid-cols-1 gap-1 rounded-xl bg-background-secondary-default p-1 sm:grid-cols-2 xl:grid-cols-4">
          <Tab id="overview" className="justify-center rounded-lg py-3 data-[selected]:bg-background-primary-default">
            <User className="h-4 w-4" />
            Resumo clínico
          </Tab>
          <Tab id="sessions" className="justify-center rounded-lg py-3 data-[selected]:bg-background-primary-default">
            <FileText className="h-4 w-4" />
            Prontuários e sessões
          </Tab>
          <Tab id="longitudinal" className="justify-center rounded-lg py-3 data-[selected]:bg-background-primary-default">
            <TrendingUp className="h-4 w-4" />
            Evolução longitudinal
          </Tab>
          <Tab id="vault" className="justify-center rounded-lg py-3 data-[selected]:bg-background-primary-default">
            <Network className="h-4 w-4" />
            Cofre cognitivo (Vault)
          </Tab>
        </TabList>

        {/* ABA 1: RESUMO CLÍNICO */}
        <TabPanel id="overview" className="min-w-0 space-y-6">
          <MetricStrip>
            <MetricCard label="Idade" value={data.patient.age === null ? "—" : `${data.patient.age} anos`} />
            <MetricCard label="Tempo em tratamento" value={data.patient.treatmentDuration} />
            <MetricCard label="Periodicidade" value={data.patient.sessionFrequency} />
            <MetricCard label="Sessões realizadas" value={completedSessions.length} />
            <MetricCard label="Sessões agendadas" value={scheduledSessions.length} />
            <MetricCard
              label="Risco clínico"
              value={
                <Badge variant={data.patient.riskLevel === "atenção" ? "warning" : data.patient.riskLevel === "baixo" ? "success" : "default"}>
                  {data.patient.riskLevel}
                </Badge>
              }
            />
          </MetricStrip>

          <section>
            <Card>
              <CardContent className="p-5">
                <p className="text-body-medium text-text-secondary">Próximas sessões</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scheduledSessions.length ? (
                    scheduledSessions.map((item) => (
                      <Badge
                        key={item.id}
                        variant={(item.attentionIndex ?? 0) >= 80 ? "warning" : "muted"}
                      >
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        {item.date} às {item.time}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="muted">Sem agendamentos futuros</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Síntese Atual dos Prontuários */}
          {isApiMode ? <section className="space-y-4"><h2 className="text-headline-semibold">Análises assistivas registradas</h2>{data.analyses.length ? data.analyses.map((item) => <AIAnalysisCard key={item.id} analysis={item} />) : <EmptyState title="Nenhuma análise registrada" description="A ausência de análise não representa ausência de risco. A avaliação clínica pertence ao profissional." />}</section> : <Card className="border-border-button-default">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-headline-regular">
                <Sparkles className="h-4 w-4 text-status-blue-text" />
                Síntese clínica consolidada da IA consultiva
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-caption-1-regular text-text-secondary">Humor</p>
                  <p className="text-headline-semibold tabular-nums">
                    {analysis?.moodScore == null ? "—" : `${analysis.moodScore}%`}
                  </p>
                </div>
                <div>
                  <p className="text-caption-1-regular text-text-secondary">Estado emocional</p>
                  <p className="text-headline-semibold tabular-nums">
                    {analysis?.emotionalStateScore == null ? "—" : `${analysis.emotionalStateScore}%`}
                  </p>
                </div>
                <div>
                  <p className="text-caption-1-regular text-text-secondary">Encargo psicológico</p>
                  <p className="text-headline-semibold tabular-nums">
                    {analysis?.psychologicalBurdenScore == null ? "—" : `${analysis.psychologicalBurdenScore}%`}
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-body-medium">
                  <AlertTriangle className="h-4 w-4 text-status-yellow-text" />
                  Cenários de risco identificados
                </h3>
                <ul className="aelo-record list-inside list-disc space-y-1 text-text-secondary">
                  {riskScenarios.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-body-medium">Maiores pontos a considerar</h3>
                <div className="flex flex-wrap gap-2">
                  {considerations.map((item) => (
                    <Badge key={item} variant="default">
                      {item}
                    </Badge>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>}
        </TabPanel>

        {/* ABA 2: PRONTUÁRIOS E SESSÕES */}
        <TabPanel id="sessions" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-button-default pb-3">
            <div>
              <h2 className="text-headline-semibold">Histórico de atendimentos e prontuários</h2>
              <p className="text-caption-1-regular text-text-secondary">
                Evoluções documentais da psicoterapia com editor de análise colapsável sob demanda.
              </p>
            </div>
            <Badge variant="muted">{data.sessions.length} atendimentos</Badge>
          </div>

          <ol className="aelo-thread-list space-y-8">
            {data.sessions.map((session) => (
              <li key={session.id} className="aelo-thread-item space-y-3 pb-4">
                <SessionCard
                  session={session}
                  notes={notes.filter((note) => note.sessionId === session.id)}
                />
                {isApiMode ? (user?.role === "PSYCHOLOGIST" && session.professionalId === user.id ? <ButtonLink to={`/editor?patient=${encodeURIComponent(patientId)}&session=${encodeURIComponent(session.id)}`}>Abrir editor desta sessão</ButtonLink> : <p className="text-caption-1-regular text-text-secondary">A edição desta sessão é restrita ao profissional responsável.</p>) : <SessionAnalysisBlock patientId={data.patient.id} session={session} />}
              </li>
            ))}
          </ol>
        </TabPanel>

        {/* ABA 3: EVOLUÇÃO LONGITUDINAL */}
        <TabPanel id="longitudinal" className="min-w-0 space-y-6">
          <div className="border-b border-border-button-default pb-3">
            <h2 className="text-headline-semibold">Métricas e Evolução longitudinal</h2>
            <p className="text-caption-1-regular text-text-secondary">
              Variação dos indicadores clínicos estimada ao longo do acompanhamento psicoterapêutico.
            </p>
          </div>

          {isApiMode ? <EmptyState title="Indicadores longitudinais indisponíveis" description="Esta visualização ainda não possui um pipeline validado conectado à API. Nenhum escore clínico foi estimado." /> : <div className="space-y-5">
            <ChartCard
              title="Indicador de humor"
              description="Indicador estimado a partir dos prontuários analisados nas sessões."
              data={metrics}
              dataKey="mood"
            />
            <ChartCard
              title="Estado emocional"
              description="Variação da intensidade afetiva e estabilidade ao longo do acompanhamento."
              data={metrics}
              dataKey="emotionalState"
            />
            <ChartCard
              title="Encargos psicológicos"
              description="Potenciais sobrecargas e encargos identificados nas narrativas clínicas."
              data={metrics}
              dataKey="psychologicalBurden"
            />
          </div>}
        </TabPanel>

        {/* ABA 4: COFRE COGNITIVO (VAULT) */}
        <TabPanel id="vault" className="min-w-0 space-y-4">
          <PatientVault patientId={patientId} analyses={data.analyses} onSelectNote={handleSelectNote} />
        </TabPanel>
      </Tabs>
    </>
  );
}
