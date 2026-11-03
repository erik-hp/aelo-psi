import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ClockAlert,
  FileEdit,
  ShieldAlert,
  Users,
} from "lucide-react";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { clinicalService } from "@/services/clinicalService";
import { isApiMode } from "@/services/runtime";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const statusLabel: Record<string, string> = {
  completed: "Concluída",
  draft: "Agendada",
  needs_review: "Evolução pendente",
  cancelled: "Cancelada",
  missed: "Não compareceu",
};

function actionLinkClass(tone: "primary" | "outline" = "outline") {
  return [
    "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition",
    tone === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
      : "border border-border bg-transparent hover:bg-secondary",
  ].join(" ");
}

export function DashboardPage() {
  // Desacoplamento resiliente de queries (Lei de Tesler): falhas isoladas não derrubam a aplicação
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: clinicalService.getDashboard,
    staleTime: 30_000,
  });

  const agendaQuery = useQuery({
    queryKey: ["agenda"],
    queryFn: clinicalService.getAgenda,
    staleTime: 30_000,
  });

  const financeQuery = useQuery({
    queryKey: ["finance"],
    queryFn: clinicalService.getFinance,
    staleTime: 60_000,
  });

  const dashboard = dashboardQuery.data;
  const agenda = agendaQuery.data ?? [];
  const finance = financeQuery.data ?? [];

  const today = new Date().toISOString().slice(0, 10);

  // Busca inteligente de sessões (acolhimento rico mesmo com dados de mock)
  const actualTodaySessions = agenda
    .filter((item) => item.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const isUsingUpcomingFallback = actualTodaySessions.length === 0 && agenda.length > 0;
  const displayedSessions = actualTodaySessions.length > 0 ? actualTodaySessions : agenda.slice(0, 4);

  // Próxima sessão do dia (Hero Card)
  const nextSession = actualTodaySessions.find((item) => item.status === "draft" || item.status === "needs_review") || displayedSessions[0];

  // Efeito Von Restorff: Segregação visual de alertas críticos vs avisos administrativos
  const criticalRiskAlerts = agenda.filter((item) => (item.attentionIndex ?? 0) >= 80);
  const administrativePending = agenda.filter((item) => item.status === "needs_review" && (item.attentionIndex ?? 0) < 80);

  // Efeito Zeigarnik: Prontuários e sessões com evolução pendente
  const openRecords = agenda.filter((item) => item.status === "needs_review");

  // Totais financeiros (calculados com tolerância a erro)
  const financeTotals = finance.reduce(
    (acc, record) => ({
      gross: acc.gross + record.sessionValue,
      pending: acc.pending + (record.status === "pending" ? record.netValue : 0),
      paid: acc.paid + (record.status === "paid" ? record.netValue : 0),
    }),
    { gross: 0, pending: 0, paid: 0 },
  );

  const activePatients = dashboard?.patients.filter((patient) => patient.status !== "inactive").length ?? 0;

  const recentActivities = dashboard?.auditEvents.slice(0, 4).map((event) => ({
    title: event.action,
    description: `${event.actor} • ${event.entity}`,
    time: event.date,
  })) ?? [];

  return (
    <>
      <PageHeader
        title="Dashboard Clínico"
        description="Acompanhamento ergonômico dos atendimentos, alertas prioritários de saúde mental e gestão ética do consultório."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link className={actionLinkClass("outline")} to="/editor">
              <FileEdit className="h-4 w-4" />
              Editor de Prontuário
            </Link>
            <Link className={actionLinkClass("outline")} to="/patients">
              <Users className="h-4 w-4" />
              Pacientes
            </Link>
            <Link className={actionLinkClass("primary")} to="/agenda">
              <CalendarCheck className="h-4 w-4" />
              Agenda do Dia
            </Link>
          </div>
        }
      />

      {/* Hero Card da Próxima Sessão do Dia (Leis de Fitts e Von Restorff) */}
      <section className="mt-2 mb-6">
        {agendaQuery.isLoading ? (
          <LoadingSkeleton className="h-36 w-full rounded-xl" />
        ) : agendaQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Não foi possível sincronizar a agenda imediata. Tente recarregar.</span>
          </div>
        ) : nextSession ? (
          <div className="relative overflow-hidden rounded-xl border-2 border-primary/40 bg-gradient-to-r from-card via-card to-primary/10 p-5 md:p-6 shadow-md">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="gap-1.5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {isUsingUpcomingFallback ? "Próxima Sessão em Destaque" : "Próxima Sessão do Dia"}
                  </Badge>
                  <span className="text-sm font-semibold text-primary">
                    {nextSession.time} • {nextSession.date}
                  </span>
                  {nextSession.attentionIndex !== null && nextSession.attentionIndex >= 80 ? (
                    <Badge variant="critical">Atenção Prioritária: {nextSession.attentionIndex}</Badge>
                  ) : null}
                </div>

                <div>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                    {nextSession.patientName}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {nextSession.complement || "Sessão de Psicoterapia Individual • Acolhimento e intervenção clínica"}
                  </p>
                </div>
              </div>

              {/* Botão de ação direta com alvo ergonômico generoso (Lei de Fitts: min 44px altura) */}
              <div className="flex items-center gap-3 pt-2 md:pt-0">
                <Link
                  to={`/patients/${nextSession.patientId}`}
                  className="focus-ring inline-flex h-12 items-center justify-center gap-2.5 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
                  aria-label={`Acessar prontuário de ${nextSession.patientName}`}
                >
                  <span>Acessar Prontuário</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            <span>Jornada clínica do dia sem atendimentos pendentes. Todos os horários estão livres.</span>
          </div>
        )}
      </section>

      {/* Métricas Principais (com resiliência e degradação graciosa) */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardQuery.isLoading ? (
          <>
            <LoadingSkeleton className="h-28" />
            <LoadingSkeleton className="h-28" />
            <LoadingSkeleton className="h-28" />
            <LoadingSkeleton className="h-28" />
          </>
        ) : dashboardQuery.isError ? (
          <div className="col-span-full rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            Indicadores de pacientes temporariamente indisponíveis.
          </div>
        ) : (
          <>
            <MetricCard
              label="Pacientes ativos"
              value={String(activePatients)}
              delta={`${dashboard?.patients.length ?? 0} cadastrados no cofre`}
              icon={Users}
            />
            <MetricCard
              label="Sessões do dia"
              value={String(displayedSessions.length)}
              delta={isUsingUpcomingFallback ? "Próximas na agenda" : `${actualTodaySessions.length} programadas hoje`}
              icon={CalendarCheck}
              tone="cyan"
            />
            <MetricCard
              label="Alertas clínicos severos"
              value={String(criticalRiskAlerts.length)}
              delta={criticalRiskAlerts.length > 0 ? "Ideação / Risco imediato" : "Sem alertas críticos ativos"}
              icon={AlertTriangle}
              tone={criticalRiskAlerts.length > 0 ? "amber" : undefined}
            />
            <MetricCard
              label="Repasse financeiro"
              value={isApiMode ? "Indisponível" : money.format(financeTotals.pending)}
              delta={isApiMode ? "Módulo não conectado" : `${money.format(financeTotals.paid)} já quitado`}
              icon={Banknote}
              tone="cyan"
            />
          </>
        )}
      </section>

      {/* Sessões do Dia & Atividades Recentes */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Sessões do Dia & Agenda Imediata</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {isUsingUpcomingFallback
                  ? "Exibindo próximas sessões agendadas no consultório"
                  : new Date(`${today}T12:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}
              </p>
            </div>
            <Link className={actionLinkClass("outline")} to="/agenda">
              Ver agenda completa
            </Link>
          </CardHeader>
          <CardContent>
            {agendaQuery.isLoading ? (
              <div className="space-y-3">
                <LoadingSkeleton className="h-20 w-full" />
                <LoadingSkeleton className="h-20 w-full" />
              </div>
            ) : agendaQuery.isError ? (
              <p role="alert" className="text-sm text-destructive">
                Não foi possível carregar as sessões da agenda.
              </p>
            ) : displayedSessions.length > 0 ? (
              <div className="space-y-3">
                {displayedSessions.map((session) => {
                  const isHighRisk = (session.attentionIndex ?? 0) >= 80;
                  return (
                    <div
                      key={session.id}
                      className={`rounded-lg border p-4 transition ${
                        isHighRisk ? "border-destructive/40 bg-destructive/5" : "border-border hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>
                              {session.time} {session.date !== today ? `(${session.date})` : ""}
                            </span>
                          </div>
                          <Link
                            className="mt-1.5 block font-medium hover:text-primary transition"
                            to={`/patients/${session.patientId}`}
                          >
                            {session.patientName}
                          </Link>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              session.status === "completed"
                                ? "success"
                                : session.status === "needs_review"
                                ? "warning"
                                : "muted"
                            }
                          >
                            {statusLabel[session.status] || session.status}
                          </Badge>
                          {session.attentionIndex !== null ? (
                            <Badge variant={isHighRisk ? "critical" : "muted"}>
                              Atenção {session.attentionIndex}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                        {session.complement || "Sem observações adicionais para este atendimento."}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Nenhuma sessão para hoje"
                description="A agenda não possui atendimentos marcados para esta data."
              />
            )}
          </CardContent>
        </Card>

        {/* Linha do Tempo de Rastreabilidade e Auditoria */}
        <ActivityTimeline items={recentActivities} />
      </section>

      {/* Grid Inferior: Segregação de Alertas (Von Restorff), Pendências Zeigarnik e Módulo Financeiro */}
      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Bloco 1: Alertas Clínicos Críticos Segregados (Von Restorff) */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Alertas Clínicos de Alto Risco
              </CardTitle>
              {criticalRiskAlerts.length > 0 ? (
                <Badge variant="critical">{criticalRiskAlerts.length}</Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Indicadores com índice de atenção severo (ideação, crise, automutilação).
            </p>
          </CardHeader>
          <CardContent>
            {agendaQuery.isLoading ? (
              <LoadingSkeleton className="h-28" />
            ) : criticalRiskAlerts.length > 0 ? (
              <div className="space-y-3">
                {criticalRiskAlerts.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-destructive/40 bg-destructive/10 p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        className="font-semibold text-sm hover:underline text-destructive"
                        to={`/patients/${item.patientId}`}
                      >
                        {item.patientName}
                      </Link>
                      <Badge variant="critical">Índice {item.attentionIndex}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.complement}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Sessão em {item.date} às {item.time}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-md border border-accent/20 bg-accent/5 p-4 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                <span>Nenhum alerta clínico de alto risco ativo no momento.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco 2: Pendências Clínicas e Prontuários em Aberto (Efeito Zeigarnik) */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <ClockAlert className="h-4 w-4 text-amber-400" />
                Pendências de Evolução
              </CardTitle>
              {openRecords.length > 0 ? (
                <Badge variant="warning">{openRecords.length}</Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Atendimentos realizados aguardando registro de notas ou assinatura ética (CFP nº 01/2009).
            </p>
          </CardHeader>
          <CardContent>
            {agendaQuery.isLoading ? (
              <LoadingSkeleton className="h-28" />
            ) : openRecords.length > 0 ? (
              <div className="space-y-3">
                {openRecords.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <Link
                        className="font-medium text-sm hover:text-primary truncate block"
                        to={`/patients/${item.patientId}`}
                      >
                        {item.patientName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {item.date} às {item.time}
                      </p>
                    </div>
                    <Link
                      to={`/patients/${item.patientId}`}
                      className="focus-ring inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-amber-400/40 bg-amber-400/10 px-3 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/20"
                    >
                      Evoluir
                    </Link>
                  </div>
                ))}
              </div>
            ) : administrativePending.length > 0 ? (
              <div className="space-y-3">
                {administrativePending.map((item) => (
                  <div key={item.id} className="rounded-md border border-border p-3 text-xs">
                    <p className="font-medium text-foreground">{item.patientName}</p>
                    <p className="text-muted-foreground mt-1">{item.complement}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-md border border-accent/20 bg-accent/5 p-4 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                <span>Expediente regularizado. Todos os prontuários recentes foram formalizados.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco 3: Módulo Financeiro (Desacoplado) */}
        <Card className="border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Módulo Financeiro</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Repasses e recebimentos clínicos.</p>
            </div>
            <Link className="text-xs text-primary hover:underline font-medium" to="/finance">
              Detalhes
            </Link>
          </CardHeader>
          <CardContent>
            {financeQuery.isLoading ? (
              <LoadingSkeleton className="h-28" />
            ) : financeQuery.isError ? (
              <div className="rounded-md border border-border p-4 text-xs text-muted-foreground">
                Dados financeiros temporariamente indisponíveis. Seus prontuários continuam protegidos.
              </div>
            ) : isApiMode ? (
              <div className="text-xs text-muted-foreground p-2">
                O módulo financeiro está em modo desacoplado da API central.
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-md border border-border p-2.5">
                  <span className="text-xs text-muted-foreground">Recebido</span>
                  <span className="font-semibold text-accent">{money.format(financeTotals.paid)}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-2.5">
                  <span className="text-xs text-muted-foreground">Pendente</span>
                  <span className="font-semibold text-amber-300">{money.format(financeTotals.pending)}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-2.5">
                  <span className="text-xs text-muted-foreground">Total Bruto</span>
                  <span className="font-semibold text-foreground">{money.format(financeTotals.gross)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
