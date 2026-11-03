import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardPenLine,
  Clock,
  Filter,
  Play,
  Plus,
  Search,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { clinicalService } from "@/services/clinicalService";
import type { AgendaItem, SessionStatus } from "@/types/clinical";

interface StatusConfigItem {
  label: string;
  badgeVariant: "default" | "success" | "warning" | "muted" | "critical";
  description: string;
}

const statusConfig: Record<SessionStatus, StatusConfigItem> = {
  draft: {
    label: "Aguardando",
    badgeVariant: "muted",
    description: "Paciente agendado, aguardando acolhimento.",
  },
  in_progress: {
    label: "Em atendimento",
    badgeVariant: "default",
    description: "Sessão clínica em andamento no consultório.",
  },
  needs_review: {
    label: "Evolução pendente",
    badgeVariant: "warning",
    description: "Sessão realizada, aguardando registro de notas clínicas.",
  },
  completed: {
    label: "Finalizada e assinada",
    badgeVariant: "success",
    description: "Prontuário assinado e homologado eticamente.",
  },
  cancelled: {
    label: "Cancelada",
    badgeVariant: "muted",
    description: "Atendimento cancelado.",
  },
  missed: {
    label: "Não compareceu",
    badgeVariant: "critical",
    description: "Falta sem aviso prévio.",
  },
};

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(() => parseLocalDate(today));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  // Visão dual ergonômica (Leis de Hick e Fitts): Linha do tempo diária prioritária por padrão
  const [viewMode, setViewMode] = useState<"timeline" | "matrix">("timeline");

  // Estado do modal funcional de nova sessão
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newDate, setNewDate] = useState(today);
  const [newTime, setNewTime] = useState("10:00");
  const [newModality, setNewModality] = useState("Psicoterapia Individual (50 min)");
  const [newComplement, setNewComplement] = useState("");

  const { data: rawAgenda = [] } = useQuery({
    queryKey: ["agenda"],
    queryFn: clinicalService.getAgenda,
    staleTime: 30_000,
  });

  // Estado local para sessões criadas ou com status alterado nesta sessão do navegador
  const [localSessions, setLocalSessions] = useState<AgendaItem[]>([]);

  // Fusão de sessões remotas e locais
  const agenda = useMemo(() => {
    const combined = [...localSessions];
    for (const remote of rawAgenda) {
      if (!combined.some((item) => item.id === remote.id)) {
        combined.push(remote);
      }
    }
    return combined;
  }, [rawAgenda, localSessions]);

  // Encontra a data mais relevante se a data atual não tiver sessões
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(agenda.map((item) => item.date))).sort();
    return dates;
  }, [agenda]);

  const sessionsByDate = useMemo(() => {
    return agenda.reduce<Record<string, AgendaItem[]>>((acc, item) => {
      acc[item.date] = acc[item.date] ? [...acc[item.date], item] : [item];
      return acc;
    }, {});
  }, [agenda]);

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
        highAttention: items.some((item) => (item.attentionIndex ?? 0) >= 80 || item.status === "needs_review"),
      };
    });
  }, [agenda, selectedDate, sessionsByDate, today, visibleMonth]);

  const monthLabel = visibleMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const filteredItems = useMemo(() => {
    return agenda
      .filter((item) => item.date === selectedDate || item.date.includes(selectedDate))
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => item.patientName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [agenda, search, selectedDate, status]);

  const attentionItems = useMemo(() => {
    return [...agenda]
      .filter((item) => item.attentionIndex !== null || item.status === "needs_review")
      .sort((a, b) => (b.attentionIndex ?? 0) - (a.attentionIndex ?? 0))
      .slice(0, 4);
  }, [agenda]);

  const reviewCount = agenda.filter((item) => item.status === "needs_review" || (item.attentionIndex ?? 0) >= 80).length;
  const inProgressCount = agenda.filter((item) => item.status === "in_progress").length;

  const selectedDateLabel = parseLocalDate(selectedDate).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  function changeMonth(direction: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1, 12));
  }

  function changeDay(direction: number) {
    const current = parseLocalDate(selectedDate);
    current.setDate(current.getDate() + direction);
    const nextKey = dateKey(current);
    setSelectedDate(nextKey);
    setVisibleMonth(current);
  }

  // Transição do ciclo de vida clínico
  const handleUpdateStatus = (sessionId: string, newStatus: SessionStatus) => {
    setLocalSessions((prev) => {
      const exists = prev.find((item) => item.id === sessionId);
      if (exists) {
        return prev.map((item) => (item.id === sessionId ? { ...item, status: newStatus } : item));
      }
      const remote = agenda.find((item) => item.id === sessionId);
      if (remote) {
        return [...prev, { ...remote, status: newStatus }];
      }
      return prev;
    });

    notify({
      type: "success",
      title: "Status clínico atualizado",
      description: `A sessão foi atualizada para "${statusConfig[newStatus]?.label || newStatus}".`,
    });
  };

  // Criação de nova sessão
  const handleCreateSession = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPatientName.trim()) {
      notify({
        type: "error",
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do paciente para agendamento.",
      });
      return;
    }

    const newSessionItem: AgendaItem = {
      id: `session-local-${Date.now()}`,
      patientId: `p-${Date.now()}`,
      patientName: newPatientName.trim(),
      date: newDate,
      time: newTime,
      status: "draft",
      complement: `${newModality}${newComplement ? ` • ${newComplement}` : ""}`,
      attentionIndex: null,
    };

    setLocalSessions((prev) => [newSessionItem, ...prev]);
    setIsNewSessionOpen(false);
    setSelectedDate(newDate);
    setNewPatientName("");
    setNewComplement("");

    notify({
      type: "success",
      title: "Sessão agendada com sucesso",
      description: `Horário reservado para ${newSessionItem.patientName} em ${newDate} às ${newTime}.`,
    });
  };

  return (
    <>
      <PageHeader
        title="Agenda Clínica"
        description="Linha do tempo diária cronológica de atendimentos, ciclo de vida das consultas e gestão de prioridades éticas."
        action={
          <Button onClick={() => setIsNewSessionOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova sessão
          </Button>
        }
      />

      {/* Indicadores do Turno Clínico */}
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Sessões no dia selecionado"
          value={String(filteredItems.length)}
          delta={`${agenda.length} atendimentos registrados no total`}
          icon={CalendarDays}
        />
        <MetricCard
          label="Em atendimento agora"
          value={String(inProgressCount)}
          delta={inProgressCount > 0 ? "Sessão em curso no consultório" : "Nenhuma consulta ativa neste minuto"}
          icon={Clock}
          tone="cyan"
        />
        <MetricCard
          label="Pendências de evolução"
          value={String(reviewCount)}
          delta="Aguardando notas ou atenção imediata"
          icon={AlertTriangle}
          tone="amber"
        />
      </section>

      {/* Alternância Dual Ergonômica (Linha do Tempo vs Matriz Mensal - Lei de Hick) */}
      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "timeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeline")}
              className="gap-2 font-medium"
            >
              <Clock className="h-4 w-4" />
              Linha do Tempo Diária
            </Button>
            <Button
              variant={viewMode === "matrix" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("matrix")}
              className="gap-2 font-medium"
            >
              <Calendar className="h-4 w-4" />
              Matriz Mensal
            </Button>
          </div>

          {/* Navegação Rápida entre Dias (Lei de Fitts: alvos confortáveis) */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              type="button"
              onClick={() => changeDay(-1)}
              aria-label="Dia anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setSelectedDate(today);
                setVisibleMonth(parseLocalDate(today));
              }}
            >
              Hoje
            </Button>
            <Button
              size="icon"
              variant="outline"
              type="button"
              onClick={() => changeDay(1)}
              aria-label="Próximo dia"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Sugestão acolhedora caso o dia de hoje não tenha sessões cadastradas no mock */}
      {filteredItems.length === 0 && availableDates.length > 0 && selectedDate === today ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3.5 text-xs text-primary">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              A data de hoje não possui agendamentos no demonstrativo. Existem sessões cadastradas em outras datas.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => {
              const nextAvailable = availableDates[0];
              if (nextAvailable) {
                setSelectedDate(nextAvailable);
                setVisibleMonth(parseLocalDate(nextAvailable));
              }
            }}
          >
            Ver sessões em {availableDates[0]}
          </Button>
        </div>
      ) : null}

      {/* Grade Principal da Agenda */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar paciente na agenda..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
              <Select
                className="w-full sm:w-56"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filtrar por ciclo de vida"
              >
                <option value="all">Todos os status</option>
                <option value="draft">Aguardando</option>
                <option value="in_progress">Em atendimento</option>
                <option value="needs_review">Evolução pendente</option>
                <option value="completed">Finalizada e assinada</option>
                <option value="cancelled">Cancelada</option>
                <option value="missed">Não compareceu</option>
              </Select>
            </div>
          </div>

          {/* MODO MATRIZ MENSAL (quando ativado pelo usuário para planejamento macro) */}
          {viewMode === "matrix" ? (
            <Card className="border-border">
              <CardContent className="p-4 md:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Clique em um dia para selecionar e inspecionar os atendimentos.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      type="button"
                      onClick={() => changeMonth(-1)}
                      aria-label="Mês anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      type="button"
                      onClick={() => changeMonth(1)}
                      aria-label="Próximo mês"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {weekdays.map((weekday) => (
                    <div
                      key={weekday}
                      className="px-1 pb-1 text-center text-xs font-semibold text-muted-foreground"
                    >
                      {weekday}
                    </div>
                  ))}
                  {calendarDays.map((day) => (
                    <button
                      key={day.key}
                      className={cn(
                        "focus-ring min-h-20 rounded-md border border-border bg-background p-2 text-left transition hover:border-primary/40 hover:bg-secondary/60",
                        !day.isCurrentMonth && "opacity-35",
                        day.isSelected && "border-primary bg-primary/10 shadow-sm",
                        day.highAttention && "border-amber-400/40",
                      )}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day.key);
                        // Ao clicar no dia, muda suavemente para a visão diária
                        setViewMode("timeline");
                      }}
                    >
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium",
                          day.isToday && "bg-secondary text-foreground font-bold",
                          day.isSelected && "bg-primary text-primary-foreground font-bold",
                        )}
                      >
                        {day.date.getDate()}
                      </span>
                      <span className="mt-1.5 block min-h-4 text-[11px] text-muted-foreground">
                        {day.sessionCount ? `${day.sessionCount} ${day.sessionCount === 1 ? "sessão" : "sessões"}` : ""}
                      </span>
                      {day.sessionCount ? (
                        <span className="mt-1 flex gap-1">
                          {Array.from({ length: Math.min(day.sessionCount, 3) }).map((_, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                "h-1 flex-1 rounded-full",
                                day.highAttention ? "bg-amber-400" : "bg-primary",
                              )}
                            />
                          ))}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* CABEÇALHO DO DIA SELECIONADO NA LINHA DO TEMPO */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3 pt-1">
            <div>
              <h2 className="text-lg font-bold capitalize text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {selectedDateLabel}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filteredItems.length} {filteredItems.length === 1 ? "sessão agendada" : "sessões agendadas"} para este dia
              </p>
            </div>
          </div>

          {/* LISTA DA LINHA DO TEMPO CRONOLÓGICA (LEI DE JAKOB & FITTS) */}
          {filteredItems.length ? (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const conf = statusConfig[item.status] || statusConfig.draft;
                const isHighRisk = (item.attentionIndex ?? 0) >= 80;
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "transition-all shadow-sm border",
                      item.status === "in_progress" && "border-primary/60 bg-primary/5",
                      isHighRisk && "border-destructive/40 bg-destructive/5",
                      item.status === "needs_review" && !isHighRisk && "border-amber-400/40 bg-amber-400/5",
                    )}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        {/* Bloco de Horário */}
                        <div className="flex items-center gap-2.5 lg:w-32 shrink-0">
                          <div className="rounded-md border border-border bg-secondary/40 p-2 text-center">
                            <Clock className="h-4 w-4 text-primary mx-auto mb-0.5" />
                            <span className="text-sm font-bold text-foreground">{item.time}</span>
                          </div>
                        </div>

                        {/* Conteúdo Clínico */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              className="text-base font-bold text-foreground hover:text-primary transition"
                              to={`/patients/${item.patientId}`}
                            >
                              {item.patientName}
                            </Link>

                            <Badge variant={conf.badgeVariant} className="text-xs">
                              {conf.label}
                            </Badge>

                            {item.attentionIndex !== null ? (
                              <Badge variant={isHighRisk ? "critical" : "muted"}>
                                Atenção {item.attentionIndex}
                              </Badge>
                            ) : null}
                          </div>

                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {item.complement || "Sessão de psicoterapia • Sem observações preliminares"}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground/80 italic">
                            {conf.description}
                          </p>

                          {/* Ações de Transição Rápida do Ciclo de Vida Clínico */}
                          <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                            {item.status === "draft" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1.5"
                                onClick={() => handleUpdateStatus(item.id, "in_progress")}
                              >
                                <Play className="h-3.5 w-3.5 text-primary" />
                                Iniciar Consulta
                              </Button>
                            ) : null}

                            {item.status === "in_progress" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1.5 border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
                                onClick={() => handleUpdateStatus(item.id, "needs_review")}
                              >
                                <ClipboardPenLine className="h-3.5 w-3.5" />
                                Encerrar & Evoluir Nota
                              </Button>
                            ) : null}

                            {item.status === "needs_review" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
                                onClick={() => handleUpdateStatus(item.id, "completed")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Assinar & Finalizar
                              </Button>
                            ) : null}

                            <Link
                              to={`/patients/${item.patientId}`}
                              className="focus-ring inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-secondary"
                            >
                              <span>Acessar Prontuário</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Nenhuma sessão para esta data"
              description="Você não possui atendimentos agendados neste dia. Alterne as datas acima ou crie uma nova sessão."
            />
          )}
        </div>

        {/* Coluna Lateral: Prioridades e Alertas Clínicos do Período */}
        <aside className="space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Prioridades do Período
          </h2>
          {attentionItems.length > 0 ? (
            attentionItems.map((item, index) => {
              const isSevere = (item.attentionIndex ?? 0) >= 80;
              return (
                <Card key={item.id} className={isSevere ? "border-destructive/40" : undefined}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Prioridade {index + 1}
                        </span>
                        <Link
                          className="mt-0.5 block font-semibold text-sm hover:text-primary transition"
                          to={`/patients/${item.patientId}`}
                        >
                          {item.patientName}
                        </Link>
                      </div>
                      {item.attentionIndex !== null ? (
                        <Badge variant={isSevere ? "critical" : "warning"}>
                          Índice {item.attentionIndex}
                        </Badge>
                      ) : null}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.complement || "Acompanhamento longitudinal prioritário."}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                      <span>{item.date} às {item.time}</span>
                      <Link
                        to={`/patients/${item.patientId}`}
                        className="text-primary hover:underline font-medium"
                      >
                        Prontuário
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="rounded-lg border border-border p-4 text-center text-xs text-muted-foreground">
              Nenhuma sessão prioritária pendente no período.
            </div>
          )}
        </aside>
      </section>

      {/* MODAL FUNCIONAL DE NOVA SESSÃO (LEI DE FITTS: CAMPOS GENEROSOS E FOCO ACESSÍVEL) */}
      {isNewSessionOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-session-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="new-session-title" className="text-lg font-bold text-foreground">
                  Agendar Nova Sessão Clínica
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preencha os dados do paciente e o horário para reserva na agenda.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsNewSessionOpen(false)}
                aria-label="Fechar modal de agendamento"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="patient-name-input" className="text-xs font-semibold text-foreground">
                  Nome do Paciente *
                </label>
                <Input
                  id="patient-name-input"
                  placeholder="Ex: Mariana Vasconcelos"
                  value={newPatientName}
                  onChange={(event) => setNewPatientName(event.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="session-date-input" className="text-xs font-semibold text-foreground">
                    Data da Consulta *
                  </label>
                  <Input
                    id="session-date-input"
                    type="date"
                    value={newDate}
                    onChange={(event) => setNewDate(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="session-time-input" className="text-xs font-semibold text-foreground">
                    Horário *
                  </label>
                  <Input
                    id="session-time-input"
                    type="time"
                    value={newTime}
                    onChange={(event) => setNewTime(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="modality-select" className="text-xs font-semibold text-foreground">
                  Modalidade do Atendimento
                </label>
                <Select
                  id="modality-select"
                  value={newModality}
                  onChange={(event) => setNewModality(event.target.value)}
                >
                  <option value="Psicoterapia Individual (50 min)">Psicoterapia Individual (50 min)</option>
                  <option value="Psicoterapia de Casal (80 min)">Psicoterapia de Casal (80 min)</option>
                  <option value="Avaliação Psicológica">Avaliação Psicológica</option>
                  <option value="Sessão de Devolutiva">Sessão de Devolutiva</option>
                  <option value="Supervisão Clínica">Supervisão Clínica</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="complement-textarea" className="text-xs font-semibold text-foreground">
                  Objetivo Clínico ou Observações
                </label>
                <Textarea
                  id="complement-textarea"
                  placeholder="Ex: Sessão focada em reavaliação de esquemas cognitivos e manejo de ansiedade."
                  value={newComplement}
                  onChange={(event) => setNewComplement(event.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewSessionOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Confirmar Agendamento
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
