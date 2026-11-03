import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Brain,
  CalendarClock,
  CheckCircle2,
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
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionCard } from "@/components/sessions/SessionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { clinicalService } from "@/services/clinicalService";
import { clinicalDraftService } from "@/services/clinicalDraftService";
import { isApiMode } from "@/services/runtime";
import type { TherapySession } from "@/types/clinical";

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
    <div className="rounded-lg border border-border/80 bg-secondary/20 p-3 transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Brain className="h-4 w-4 text-primary" />
          <span>Análise Assistiva por IA (Sessão {session.id.slice(0, 8)})</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setDraftReady(false); setPreview(null); setIsOpen((prev) => !prev); }}
          className="h-7 text-xs font-medium text-foreground hover:bg-secondary"
        >
          {isOpen ? "Ocultar editor de análise" : "Analisar sessão com IA"}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`analysis-text-${session.id}`}>
            Texto do prontuário para extração de entidades e síntese clínica
          </label>
          <Textarea
            id={`analysis-text-${session.id}`}
            className="min-h-32 text-sm leading-relaxed"
            value={content}
            onChange={(event) => { setContent(event.target.value); setPreview(null); }}
            placeholder="Insira aqui o texto do prontuário que será analisado pela IA assistiva..."
          />
          {preview !== null ? <div className="rounded border p-3 text-xs"><p>Texto preparado para a IA. Confira os identificadores antes de confirmar:</p><pre className="whitespace-pre-wrap break-words">{preview}</pre></div> : null}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{draftError ? "Falha ao salvar o rascunho. Copie o texto antes de sair." : "Mínimo 30 caracteres para extração ontológica."}</span>
            <Button
              disabled={mutation.isPending || (isApiMode && !draftReady) || content.trim().length < 30}
              size="sm"
              type="button"
              onClick={() => {
                if (!isApiMode || preview !== null) { mutation.mutate(); return; }
                void clinicalService.previewAiText(patientId, content).then(setPreview).catch(() => notify({ type: "error", title: "Envio bloqueado", description: "Revise os identificadores da nota antes de solicitar a análise." }));
              }}
              className="gap-1.5 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              {mutation.isPending ? "Processando..." : !isApiMode ? "Enviar para análise" : preview !== null ? "Confirmar envio à IA" : "Revisar texto para IA"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PatientProfilePage() {
  const { patientId = "" } = useParams();
  const { data } = useQuery({
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
        el.classList.add("ring-2", "ring-primary");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
      }
    }, 120);
  };

  if (!data) {
    return (
      <p role="alert" className="text-sm text-destructive">
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
        description="Prontuário eletrônico psicológico estruturado em abas canônicas de acordo com as Leis de Miller e Jakob."
      />

      {/* Particionamento em 4 Abas Clínicas com foco e teclado acessível (WAI-ARIA) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 bg-secondary/50 p-1.5 md:grid-cols-4">
          <TabsTrigger value="overview" className="gap-2 py-2.5 text-xs md:text-sm font-medium">
            <User className="h-4 w-4" />
            Resumo Clínico
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2 py-2.5 text-xs md:text-sm font-medium">
            <FileText className="h-4 w-4" />
            Prontuários e Sessões
          </TabsTrigger>
          <TabsTrigger value="longitudinal" className="gap-2 py-2.5 text-xs md:text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            Evolução Longitudinal
          </TabsTrigger>
          <TabsTrigger value="vault" className="gap-2 py-2.5 text-xs md:text-sm font-medium">
            <Network className="h-4 w-4" />
            Cofre Cognitivo (Vault)
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: RESUMO CLÍNICO */}
        <TabsContent value="overview" className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Idade</p>
                <p className="mt-2 text-2xl font-semibold">
                  {data.patient.age === null ? "—" : `${data.patient.age} anos`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tempo em tratamento</p>
                <p className="mt-2 text-2xl font-semibold">{data.patient.treatmentDuration}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Periodicidade</p>
                <p className="mt-2 text-2xl font-semibold">{data.patient.sessionFrequency}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Risco clínico</p>
                <div className="mt-3">
                  <Badge
                    variant={
                      data.patient.riskLevel === "atenção"
                        ? "warning"
                        : data.patient.riskLevel === "baixo"
                          ? "success"
                          : "default"
                    }
                  >
                    {data.patient.riskLevel}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
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
                    Sessões agendadas
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{scheduledSessions.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">Próximas sessões</p>
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
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Síntese Clínica Consolidada da IA Consultiva
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Humor</p>
                  <p className="mt-2 text-xl font-semibold">
                    {analysis?.moodScore == null ? "—" : `${analysis.moodScore}%`}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Estado emocional</p>
                  <p className="mt-2 text-xl font-semibold">
                    {analysis?.emotionalStateScore == null ? "—" : `${analysis.emotionalStateScore}%`}
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Encargo psicológico</p>
                  <p className="mt-2 text-xl font-semibold">
                    {analysis?.psychologicalBurdenScore == null ? "—" : `${analysis.psychologicalBurdenScore}%`}
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />
                  Cenários de Risco Identificados
                </h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {riskScenarios.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">Maiores Pontos a Considerar</h3>
                <div className="flex flex-wrap gap-2">
                  {considerations.map((item) => (
                    <Badge key={item} variant="default">
                      {item}
                    </Badge>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: PRONTUÁRIOS E SESSÕES */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h2 className="text-base font-semibold">Histórico de Atendimentos e Prontuários</h2>
              <p className="text-xs text-muted-foreground">
                Evoluções documentais da psicoterapia com editor de análise colapsável sob demanda.
              </p>
            </div>
            <Badge variant="muted">{data.sessions.length} atendimentos</Badge>
          </div>

          <div className="space-y-4">
            {data.sessions.map((session) => (
              <div key={session.id} className="space-y-3">
                <SessionCard
                  session={session}
                  notes={notes.filter((note) => note.sessionId === session.id)}
                />
                <SessionAnalysisBlock patientId={data.patient.id} session={session} />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ABA 3: EVOLUÇÃO LONGITUDINAL */}
        <TabsContent value="longitudinal" className="space-y-6">
          <div className="border-b border-border/80 pb-3">
            <h2 className="text-base font-semibold">Métricas e Evolução Longitudinal</h2>
            <p className="text-xs text-muted-foreground">
              Variação dos indicadores clínicos estimada ao longo do acompanhamento psicoterapêutico.
            </p>
          </div>

          <div className="space-y-5">
            <ChartCard
              title="Indicador de Humor"
              description="Indicador estimado a partir dos prontuários analisados nas sessões."
              data={metrics}
              dataKey="mood"
            />
            <ChartCard
              title="Estado Emocional"
              description="Variação da intensidade afetiva e estabilidade ao longo do acompanhamento."
              data={metrics}
              dataKey="emotionalState"
            />
            <ChartCard
              title="Encargos Psicológicos"
              description="Potenciais sobrecargas e encargos identificados nas narrativas clínicas."
              data={metrics}
              dataKey="psychologicalBurden"
            />
          </div>
        </TabsContent>

        {/* ABA 4: COFRE COGNITIVO (VAULT) */}
        <TabsContent value="vault" className="space-y-4">
          <PatientVault patientId={patientId} analyses={data.analyses} onSelectNote={handleSelectNote} />
        </TabsContent>
      </Tabs>
    </>
  );
}
