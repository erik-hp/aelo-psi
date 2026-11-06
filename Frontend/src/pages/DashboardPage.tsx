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
import { ButtonLink } from "@/components/ui/button-link";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const statusLabel: Record<string, string> = {
  completed: "Concluída",
  draft: "Agendada",
  needs_review: "Evolução pendente",
  cancelled: "Cancelada",
  missed: "Não compareceu",
};

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
            <ButtonLink to="/editor">
              <FileEdit className="h-4 w-4" />
              Editor de Prontuário
            </ButtonLink>
            <ButtonLink to="/patients">
              <Users className="h-4 w-4" />
              Pacientes
            </ButtonLink>
            <ButtonLink variant="primary" to="/agenda">
              <CalendarCheck className="h-4 w-4" />
              Agenda do Dia
            </ButtonLink>
          </div>
        }
      />

      {/* Hero Card da Próxima Sessão do Dia (Leis de Fitts e Von Restorff) */}
      <section className="mt-2 mb-6">
        {agendaQuery.isLoading ? (
          <LoadingSkeleton className="h-36 w-full rounded-xl" />
        ) : agendaQuery.isError ? (
          <div className="rounded-xl border border-border-error-default bg-status-rose-background p-4 text-body-regular text-text-error-primary flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Não foi possível sincronizar a agenda imediata. Tente recarregar.</span>
          </div>
        ) : nextSession ? (
          <div className="relative overflow-hidden rounded-xl border-2 border-border-focus-ring bg-gradient-to-r from-background-primary-default via-background-primary-default to-background-secondary-default p-5 md:p-6 shadow-md">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="gap-1.5 px-2 py-0.5 text-caption-1-semibold uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5 text-status-blue-text" />
                    {isUsingUpcomingFallback ? "Próxima Sessão em Destaque" : "Próxima Sessão do Dia"}
                  </Badge>
                  <span className="text-body-semibold text-status-blue-text">
                    {nextSession.time} • {nextSession.date}
                  </span>
                  {nextSession.attentionIndex !== null && nextSession.attentionIndex >= 80 ? (
                    <Badge variant="critical">Atenção Prioritária: {nextSession.attentionIndex}</Badge>
                  ) : null}
                </div>

                <div>
                  <h2 className="text-title-3-bold md:text-title-2-bold text-text-primary">
                    {nextSession.patientName}
                  </h2>
                  <p className="text-body-regular text-text-secondary mt-0.5">
                    {nextSession.complement || "Sessão de Psicoterapia Individual • Acolhimento e intervenção clínica"}
                  </p>
                </div>
              </div>

              {/* Botão de ação direta com alvo ergonômico generoso (Lei de Fitts: min 44px altura) */}
              <div className="flex items-center gap-3 pt-2 md:pt-0">
                <ButtonLink
                  to={`/patients/${nextSession.patientId}`}
                  variant="primary" className="min-h-12 px-6"
                  aria-label={`Acessar prontuário de ${nextSession.patientName}`}
                >
                  <span>Acessar Prontuário</span>
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border-button-default bg-background-primary-default p-5 text-center text-body-regular text-text-secondary flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-status-lime-text" />
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
          <div className="col-span-full rounded-md border border-border-error-default bg-status-rose-background p-3 text-caption-1-regular text-text-error-primary">
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
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Sessões do Dia & Agenda Imediata</CardTitle>
              <p className="mt-1 text-body-regular text-text-secondary">
                {isUsingUpcomingFallback
                  ? "Exibindo próximas sessões agendadas no consultório"
                  : new Date(`${today}T12:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}
              </p>
            </div>
            <ButtonLink to="/agenda">
              Ver agenda completa
            </ButtonLink>
          </CardHeader>
          <CardContent>
            {agendaQuery.isLoading ? (
              <div className="space-y-3">
                <LoadingSkeleton className="h-20 w-full" />
                <LoadingSkeleton className="h-20 w-full" />
              </div>
            ) : agendaQuery.isError ? (
              <p role="alert" className="text-body-regular text-text-error-primary">
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
                        isHighRisk ? "border-border-error-default bg-status-rose-background" : "border-border-button-default hover:bg-background-secondary-default"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-body-semibold">
                            <Clock className="h-4 w-4 text-status-blue-text" />
                            <span>
                              {session.time} {session.date !== today ? `(${session.date})` : ""}
                            </span>
                          </div>
                          <Link
                            className="mt-1.5 block text-body-medium hover:text-status-blue-text transition"
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
                      <p className="mt-2.5 text-body-regular text-text-secondary">
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
        <Card className="border-border-button-default">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-headline-regular flex items-center gap-2 text-text-primary">
                <ShieldAlert className="h-4 w-4 text-text-error-primary" />
                Alertas Clínicos de Alto Risco
              </CardTitle>
              {criticalRiskAlerts.length > 0 ? (
                <Badge variant="critical">{criticalRiskAlerts.length}</Badge>
              ) : null}
            </div>
            <p className="text-caption-1-regular text-text-secondary mt-1">
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
                    className="rounded-md border border-border-error-default bg-status-rose-background p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        className="text-body-semibold hover:underline text-text-error-primary"
                        to={`/patients/${item.patientId}`}
                      >
                        {item.patientName}
                      </Link>
                      <Badge variant="critical">Índice {item.attentionIndex}</Badge>
                    </div>
                    <p className="text-caption-1-regular text-text-secondary">{item.complement}</p>
                    <p className="text-caption-1-regular text-text-secondary">
                      Sessão em {item.date} às {item.time}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-md border border-status-lime-text bg-status-lime-background p-4 text-caption-1-regular text-text-secondary">
                <CheckCircle2 className="h-4 w-4 text-status-lime-text shrink-0" />
                <span>Nenhum alerta clínico de alto risco ativo no momento.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco 2: Pendências Clínicas e Prontuários em Aberto (Efeito Zeigarnik) */}
        <Card className="border-border-button-default">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-headline-regular flex items-center gap-2 text-text-primary">
                <ClockAlert className="h-4 w-4 text-status-yellow-text" />
                Pendências de Evolução
              </CardTitle>
              {openRecords.length > 0 ? (
                <Badge variant="warning">{openRecords.length}</Badge>
              ) : null}
            </div>
            <p className="text-caption-1-regular text-text-secondary mt-1">
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
                    className="flex items-center justify-between gap-3 rounded-md border border-border-button-default p-3"
                  >
                    <div className="min-w-0">
                      <Link
                        className="text-body-medium hover:text-status-blue-text truncate block"
                        to={`/patients/${item.patientId}`}
                      >
                        {item.patientName}
                      </Link>
                      <p className="text-caption-1-regular text-text-secondary">
                        {item.date} às {item.time}
                      </p>
                    </div>
                    <ButtonLink
                      to={`/patients/${item.patientId}`}
                      size="small" className="shrink-0"
                    >
                      Evoluir
                    </ButtonLink>
                  </div>
                ))}
              </div>
            ) : administrativePending.length > 0 ? (
              <div className="space-y-3">
                {administrativePending.map((item) => (
                  <div key={item.id} className="rounded-md border border-border-button-default p-3 text-caption-1-regular">
                    <p className="text-body-medium text-text-primary">{item.patientName}</p>
                    <p className="text-text-secondary mt-1">{item.complement}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-md border border-status-lime-text bg-status-lime-background p-4 text-caption-1-regular text-text-secondary">
                <CheckCircle2 className="h-4 w-4 text-status-lime-text shrink-0" />
                <span>Expediente regularizado. Todos os prontuários recentes foram formalizados.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco 3: Módulo Financeiro (Desacoplado) */}
        <Card className="border-border-button-default">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-headline-regular">Módulo Financeiro</CardTitle>
              <p className="text-caption-1-regular text-text-secondary mt-1">Repasses e recebimentos clínicos.</p>
            </div>
            <Link className="text-caption-1-medium text-status-blue-text hover:underline" to="/finance">
              Detalhes
            </Link>
          </CardHeader>
          <CardContent>
            {financeQuery.isLoading ? (
              <LoadingSkeleton className="h-28" />
            ) : financeQuery.isError ? (
              <div className="rounded-md border border-border-button-default p-4 text-caption-1-regular text-text-secondary">
                Dados financeiros temporariamente indisponíveis. Seus prontuários continuam protegidos.
              </div>
            ) : isApiMode ? (
              <div className="text-caption-1-regular text-text-secondary p-2">
                O módulo financeiro está em modo desacoplado da API central.
              </div>
            ) : (
              <div className="space-y-3 text-body-regular">
                <div className="flex items-center justify-between rounded-md border border-border-button-default p-2.5">
                  <span className="text-caption-1-regular text-text-secondary">Recebido</span>
                  <span className="text-body-semibold text-status-lime-text">{money.format(financeTotals.paid)}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border-button-default p-2.5">
                  <span className="text-caption-1-regular text-text-secondary">Pendente</span>
                  <span className="text-body-semibold text-status-yellow-text">{money.format(financeTotals.pending)}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border-button-default p-2.5">
                  <span className="text-caption-1-regular text-text-secondary">Total Bruto</span>
                  <span className="text-body-semibold text-text-primary">{money.format(financeTotals.gross)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
