import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  ClipboardList,
  Clock,
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

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const statusLabel = {
  completed: "Concluída",
  draft: "Agendada",
  needs_review: "Revisar",
};

function actionLinkClass(tone: "primary" | "outline" = "outline") {
  return [
    "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition",
    tone === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "border border-border bg-transparent hover:bg-secondary",
  ].join(" ");
}

export function DashboardPage() {
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: clinicalService.getDashboard });
  const agendaQuery = useQuery({ queryKey: ["agenda"], queryFn: clinicalService.getAgenda });
  const financeQuery = useQuery({ queryKey: ["finance"], queryFn: clinicalService.getFinance });

  if (dashboardQuery.isLoading || agendaQuery.isLoading || financeQuery.isLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <LoadingSkeleton key={item} className="h-32" />)}
        </div>
      </div>
    );
  }

  const dashboard = dashboardQuery.data;
  const agenda = agendaQuery.data ?? [];
  const finance = financeQuery.data ?? [];

  if (!dashboard) return null;

  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = agenda
    .filter((item) => item.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
  const pendingSessions = agenda.filter((item) => item.status === "draft").length;
  const attentionCount = agenda.filter((item) => item.status === "needs_review" || item.attentionIndex >= 80).length;
  const activePatients = dashboard.patients.filter((patient) => patient.status !== "inactive").length;
  const financeTotals = finance.reduce(
    (acc, record) => ({
      gross: acc.gross + record.sessionValue,
      pending: acc.pending + (record.status === "pending" ? record.netValue : 0),
      paid: acc.paid + (record.status === "paid" ? record.netValue : 0),
    }),
    { gross: 0, pending: 0, paid: 0 },
  );

  const recentActivities = dashboard.auditEvents.slice(0, 4).map((event) => ({
    title: event.action,
    description: `${event.actor} • ${event.entity}`,
    time: event.date,
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumo operacional do dia com agenda, atividades recentes, indicadores clínicos e financeiro."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link className={actionLinkClass("outline")} to="/patients">
              <Users className="h-4 w-4" />
              Pacientes
            </Link>
            <Link className={actionLinkClass("primary")} to="/agenda">
              <CalendarCheck className="h-4 w-4" />
              Agenda
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pacientes ativos" value={String(activePatients)} delta={`${dashboard.patients.length} cadastrados`} icon={Users} />
        <MetricCard label="Sessões hoje" value={String(todaySessions.length)} delta={`${pendingSessions} próximas na agenda`} icon={CalendarCheck} tone="cyan" />
        <MetricCard label="Em atenção" value={String(attentionCount)} delta="Prioridade para revisar" icon={AlertTriangle} tone="amber" />
        <MetricCard label="Repasse pendente" value={money.format(financeTotals.pending)} delta={`${money.format(financeTotals.paid)} já recebido`} icon={Banknote} tone="cyan" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Sessões do dia</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(`${today}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
            </div>
            <Link className={actionLinkClass("outline")} to="/agenda">
              Ver agenda
            </Link>
          </CardHeader>
          <CardContent>
            {todaySessions.length ? (
              <div className="space-y-3">
                {todaySessions.map((session) => (
                  <div key={session.id} className="rounded-md border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Clock className="h-4 w-4 text-primary" />
                          {session.time}
                        </div>
                        <Link className="mt-2 block font-medium hover:text-primary" to={`/patients/${session.patientId}`}>
                          {session.patientName}
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={session.status === "completed" ? "success" : session.status === "needs_review" ? "warning" : "muted"}>
                          {statusLabel[session.status]}
                        </Badge>
                        <Badge variant={session.attentionIndex >= 80 ? "warning" : "muted"}>Atenção {session.attentionIndex}</Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{session.complement}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhuma sessão para hoje" description="A agenda não possui sessões marcadas para esta data." />
            )}
          </CardContent>
        </Card>

        <ActivityTimeline items={recentActivities} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Financeiro</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Resumo de sessões, recebimentos e repasses.</p>
            </div>
            <Link className={actionLinkClass("outline")} to="/finance">
              Abrir financeiro
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border p-4">
              <p className="text-sm text-muted-foreground">Bruto</p>
              <p className="mt-2 text-lg font-semibold">{money.format(financeTotals.gross)}</p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="text-sm text-muted-foreground">Recebido</p>
              <p className="mt-2 text-lg font-semibold">{money.format(financeTotals.paid)}</p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="text-sm text-muted-foreground">Pendente</p>
              <p className="mt-2 text-lg font-semibold">{money.format(financeTotals.pending)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fila de revisão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agenda
                .filter((item) => item.attentionIndex >= 80 || item.status === "needs_review")
                .slice(0, 3)
                .map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-4">
                    <div>
                      <Link className="font-medium hover:text-primary" to={`/patients/${item.patientId}`}>
                        {item.patientName}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">{item.date} às {item.time}</p>
                    </div>
                    <Badge variant="warning">{item.attentionIndex}</Badge>
                  </div>
                ))}
              {!attentionCount ? (
                <div className="flex items-center gap-2 rounded-md border border-border p-4 text-sm text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                  Nenhuma revisão pendente.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
