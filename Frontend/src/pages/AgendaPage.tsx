import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, ClipboardPenLine, Clock, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { clinicalService } from "@/services/clinicalService";

const statusLabel = {
  completed: "Concluída",
  draft: "Agendada",
  needs_review: "Revisar",
};

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function AgendaPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(() => parseLocalDate(today));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const { data = [] } = useQuery({ queryKey: ["agenda"], queryFn: clinicalService.getAgenda });

  const sessionsByDate = useMemo(() => {
    return data.reduce<Record<string, typeof data>>((acc, item) => {
      acc[item.date] = acc[item.date] ? [...acc[item.date], item] : [item];
      return acc;
    }, {});
  }, [data]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(year, month, 1 - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = dateKey(date);
      const items = sessionsByDate[key] ?? [];
      return {
        date,
        key,
        isCurrentMonth: date.getMonth() === month,
        isToday: key === today,
        isSelected: key === selectedDate,
        sessionCount: items.length,
        highAttention: items.some((item) => item.attentionIndex >= 80 || item.status === "needs_review"),
      };
    });
  }, [selectedDate, sessionsByDate, today, visibleMonth]);

  const monthLabel = visibleMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const filteredItems = useMemo(() => {
    return data
      .filter((item) => item.date === selectedDate || item.date.includes(selectedDate))
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => item.patientName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [data, search, selectedDate, status]);

  const attentionItems = useMemo(() => [...data].sort((a, b) => b.attentionIndex - a.attentionIndex).slice(0, 4), [data]);
  const reviewCount = data.filter((item) => item.status === "needs_review" || item.attentionIndex >= 80).length;
  const complementCount = data.filter((item) => item.complement).length;
  const selectedDateLabel = parseLocalDate(selectedDate).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  function changeMonth(direction: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1, 12));
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Sessões do dia, complementos do prontuário e pacientes que exigem maior atenção no período."
        action={<Button><Plus className="h-4 w-4" /> Nova sessão</Button>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Sessões no dia" value={String(filteredItems.length)} icon={CalendarDays} />
        <MetricCard label="Complementos" value={String(complementCount)} icon={ClipboardPenLine} tone="cyan" />
        <MetricCard label="Em atenção" value={String(reviewCount)} icon={AlertTriangle} tone="amber" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar paciente" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select className="lg:w-44" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status da sessão">
              <option value="all">Todos</option>
              <option value="draft">Agendadas</option>
              <option value="completed">Concluídas</option>
              <option value="needs_review">Revisar</option>
            </Select>
          </div>

          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Selecione um dia para visualizar as sessões vinculadas.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" type="button" onClick={() => changeMonth(-1)} aria-label="Mes anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setSelectedDate(today);
                      setVisibleMonth(parseLocalDate(today));
                    }}
                  >
                    Hoje
                  </Button>
                  <Button size="icon" variant="outline" type="button" onClick={() => changeMonth(1)} aria-label="Proximo mes">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekdays.map((weekday) => (
                  <div key={weekday} className="px-1 pb-1 text-center text-xs font-medium text-muted-foreground">
                    {weekday}
                  </div>
                ))}
                {calendarDays.map((day) => (
                  <button
                    key={day.key}
                    className={cn(
                      "focus-ring min-h-24 rounded-md border border-border bg-background p-2 text-left transition hover:border-primary/40 hover:bg-secondary/60",
                      !day.isCurrentMonth && "opacity-40",
                      day.isSelected && "border-primary bg-primary/10",
                      day.highAttention && "border-amber-400/40",
                    )}
                    type="button"
                    onClick={() => setSelectedDate(day.key)}
                  >
                    <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium", day.isToday && "bg-secondary text-foreground", day.isSelected && "bg-primary text-primary-foreground")}>
                      {day.date.getDate()}
                    </span>
                    <span className="mt-2 block min-h-5 text-xs text-muted-foreground">
                      {day.sessionCount ? `${day.sessionCount} ${day.sessionCount === 1 ? "sessao" : "sessoes"}` : ""}
                    </span>
                    {day.sessionCount ? (
                      <span className="mt-2 flex gap-1">
                        {Array.from({ length: Math.min(day.sessionCount, 3) }).map((_, index) => (
                          <span key={index} className={cn("h-1.5 flex-1 rounded-full", day.highAttention ? "bg-amber-400" : "bg-primary")} />
                        ))}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold capitalize">{selectedDateLabel}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{filteredItems.length} sessões encontradas</p>
            </div>
          </div>

          {filteredItems.length ? (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <Card key={item.id} className={item.attentionIndex >= 80 ? "border-amber-400/40" : undefined}>
                  <CardContent className="p-5">
                    <div className="grid gap-4 lg:grid-cols-[96px_1fr_auto] lg:items-start">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Clock className="h-4 w-4 text-primary" />
                        {item.time}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link className="font-semibold hover:text-primary" to={`/patients/${item.patientId}`}>
                            {item.patientName}
                          </Link>
                          <Badge variant={item.status === "completed" ? "success" : item.status === "needs_review" ? "warning" : "muted"}>
                            {statusLabel[item.status]}
                          </Badge>
                          <Badge variant={item.attentionIndex >= 80 ? "warning" : "muted"}>Atenção {item.attentionIndex}</Badge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.complement}</p>
                      </div>
                      <Link
                        className="focus-ring inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-xs font-medium transition hover:bg-secondary"
                        to={`/patients/${item.patientId}`}
                      >
                        Abrir prontuário
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma sessão encontrada" description="Ajuste a data, o status ou o nome do paciente." />
          )}
        </div>

        <aside className="space-y-4">
          <h2 className="text-base font-semibold">Prioridades do período</h2>
          {attentionItems.map((item, index) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Prioridade {index + 1}</p>
                    <Link className="mt-1 block font-medium hover:text-primary" to={`/patients/${item.patientId}`}>
                      {item.patientName}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{item.date} às {item.time}</p>
                  </div>
                  <Badge variant={item.attentionIndex >= 80 ? "warning" : "muted"}>{item.attentionIndex}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.complement}</p>
              </CardContent>
            </Card>
          ))}
        </aside>
      </section>
    </>
  );
}
