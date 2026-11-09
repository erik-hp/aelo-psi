import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ClockAlert,
  FileEdit,
  Users,
} from "lucide-react";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { MetricCard, MetricStrip } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { clinicalService } from "@/services/clinicalService";
import { isApiMode } from "@/services/runtime";
import { ButtonLink } from "@/components/ui/button-link";
import { localDateKey } from "@/lib/dates";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const shortDate = (dateKey: string) => new Date(`${dateKey}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

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

  const today = localDateKey();

  // Busca inteligente de sessões (acolhimento rico mesmo com dados de mock)
  const actualTodaySessions = agenda
    .filter((item) => item.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const upcoming = agenda.filter((item) => item.status === "draft" && item.date >= today).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const isUsingUpcomingFallback = actualTodaySessions.length === 0 && (isApiMode ? upcoming.length > 0 : agenda.length > 0);
  const displayedSessions = actualTodaySessions.length > 0 ? actualTodaySessions : (isApiMode ? upcoming : agenda).slice(0, 4);

  // Próxima sessão do dia (Hero Card)
  const nextSession = actualTodaySessions.find((item) => item.status === "draft" || item.status === "needs_review") || (isApiMode ? upcoming[0] : displayedSessions[0]);

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
    description: `${event.actor}, ${event.entity}`,
    time: event.date,
  })) ?? [];

  return (
    <>
      <PageHeader
        title="Dashboard clínico"
        description="Acompanhe pacientes autorizados, agendamentos e registros do consultório."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink to="/editor">
              <FileEdit className="h-4 w-4" />
              Editor de prontuário
            </ButtonLink>
            <ButtonLink to="/patients">
              <Users className="h-4 w-4" />
              Pacientes
            </ButtonLink>
            <ButtonLink variant="primary" to="/agenda">
              <CalendarCheck className="h-4 w-4" />
              Agenda do dia
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
          <div className="clinical-panel p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body-medium text-text-secondary">
                    {isUsingUpcomingFallback ? "Próxima sessão" : "Próxima sessão do dia"}: {nextSession.time}, {shortDate(nextSession.date)}
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-title-2-semibold text-text-primary">
                    {nextSession.patientName}
                  </h2>
                  <p className="text-body-regular text-text-secondary mt-0.5">
                    {nextSession.complement || "Sessão de psicoterapia individual"}
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
                  <span>Acessar prontuário</span>
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
      <section aria-label="Indicadores do consultório">
        {dashboardQuery.isLoading ? (
          <LoadingSkeleton className="h-24 w-full" />
        ) : dashboardQuery.isError ? (
          <div className="rounded-md border border-border-error-default bg-status-rose-background p-3 text-caption-1-regular text-text-error-primary">
            Indicadores de pacientes temporariamente indisponíveis.
          </div>
        ) : (
          <MetricStrip>
            <MetricCard
              label="Pacientes ativos"
              value={String(activePatients)}
              delta={`${dashboard?.patients.length ?? 0} cadastrados no cofre`}
            />
            <MetricCard
              label="Sessões do dia"
              value={String(displayedSessions.length)}
              delta={isUsingUpcomingFallback ? "Próximas na agenda" : `${actualTodaySessions.length} programadas hoje`}
            />
            <MetricCard
              label="Análises registradas"
              value={String(dashboard?.analyses.length ?? 0)}
              delta="Sugestões assistivas para revisão"
            />
            <MetricCard
              label="Repasse financeiro"
              value={isApiMode ? "Indisponível" : money.format(financeTotals.pending)}
              delta={isApiMode ? "Módulo não conectado" : `${money.format(financeTotals.paid)} já quitado`}
            />
          </MetricStrip>
        )}
      </section>

      {/* Sessões do Dia & Atividades Recentes */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Sessões de hoje</CardTitle>
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
              <ul className="divide-y divide-separator-border">
                {displayedSessions.map((session) => {
                  return (
                    <li key={session.id} className="py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-body-semibold">
                            <Clock className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                            <span className="tabular-nums">
                              {session.time} {session.date !== today ? `(${shortDate(session.date)})` : ""}
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
                        </div>
                      </div>
                      <p className="mt-2 text-body-regular text-text-secondary">
                        {session.complement || "Sem observações adicionais para este atendimento."}
                      </p>
                    </li>
                  );
                })}
              </ul>
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

      {/* Grid Inferior: Segregação de Alertas (Von Restorff), Pendências Zeigarnik e Financeiro */}
      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Indicadores indisponíveis não equivalem à ausência de risco. */}
        <Card>
          <CardHeader><CardTitle>Avaliação clínica</CardTitle></CardHeader>
          <CardContent>
            <p className="text-body-regular text-text-secondary">A plataforma não classifica risco automaticamente. A ausência de indicadores não substitui a avaliação do profissional.</p>
          </CardContent>
        </Card>

        {/* Bloco 2: Pendências Clínicas e Prontuários em Aberto (Efeito Zeigarnik) */}
        {isApiMode ? <Card><CardHeader><CardTitle>Registros das sessões</CardTitle></CardHeader><CardContent><p className="text-body-regular text-text-secondary">Consulte e salve as notas no Editor Clínico. Concluir um atendimento não assina sua nota.</p><ButtonLink to="/editor" className="mt-4">Abrir editor clínico</ButtonLink></CardContent></Card> : <Card className="border-border-button-default">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-headline-regular flex items-center gap-2 text-text-primary">
                <ClockAlert className="h-4 w-4 text-status-yellow-text" />
                Pendências de evolução
              </CardTitle>
              {openRecords.length > 0 ? (
                <Badge variant="warning" showIcon={false}>{openRecords.length}</Badge>
              ) : null}
            </div>
            <p className="text-caption-1-regular text-text-secondary mt-1">
              Sessões com evolução documental pendente de revisão pelo profissional.
            </p>
          </CardHeader>
          <CardContent>
            {agendaQuery.isLoading ? (
              <LoadingSkeleton className="h-28" />
            ) : agendaQuery.isError ? (
              <p role="alert" className="text-body-regular text-text-error-primary">Não foi possível consultar as pendências documentais.</p>
            ) : openRecords.length > 0 ? (
              <ul className="divide-y divide-separator-border">
                {openRecords.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        className="text-body-medium hover:text-status-blue-text truncate block"
                        to={`/patients/${item.patientId}`}
                      >
                        {item.patientName}
                      </Link>
                      <p className="text-caption-1-regular text-text-secondary">
                        {shortDate(item.date)} às {item.time}
                      </p>
                    </div>
                    <ButtonLink
                      to={`/patients/${item.patientId}`}
                      size="small" className="shrink-0"
                    >
                      Evoluir
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2.5 rounded-md border border-status-lime-text bg-status-lime-background p-4 text-caption-1-regular text-text-secondary">
                <CheckCircle2 className="h-4 w-4 text-status-lime-text shrink-0" />
                <span>Nenhuma evolução documental pendente na agenda consultada.</span>
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Bloco 3: Financeiro (Desacoplado) */}
        <Card className="border-border-button-default">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-headline-regular">Financeiro</CardTitle>
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
                O módulo financeiro ainda não está conectado à API.
              </div>
            ) : (
              <dl className="divide-y divide-separator-border text-body-regular">
                <div className="flex items-center justify-between py-2">
                  <dt className="text-text-secondary">Recebido</dt>
                  <dd className="text-body-semibold tabular-nums">{money.format(financeTotals.paid)}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-text-secondary">Pendente</dt>
                  <dd className="text-body-semibold tabular-nums">{money.format(financeTotals.pending)}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-text-secondary">Total bruto</dt>
                  <dd className="text-body-semibold tabular-nums">{money.format(financeTotals.gross)}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
