import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardPenLine,
  Clock,
  Filter,
  Play,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/modal";
import { RiSearchLine } from "@remixicon/react";
import { ButtonLink } from "@/components/ui/button-link";
import { MetricCard, MetricStrip } from "@/components/dashboard/MetricCard";
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
import { isApiMode } from "@/services/runtime";
import { recordService } from "@/services/recordService";
import { apiErrorMessage } from "@/services/apiError";
import { useAuth } from "@/hooks/useAuth";
import { PageError, PageLoading } from "@/components/ui/page-state";

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
  const { user } = useAuth();
  const [params] = useSearchParams();
  const canSchedule = !isApiMode || user?.role === "PSYCHOLOGIST";

  const today = dateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(() => parseLocalDate(today));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  // Visão dual ergonômica (Leis de Hick e Fitts): Linha do tempo diária prioritária por padrão
  const [viewMode, setViewMode] = useState<"timeline" | "matrix">("timeline");

  // Estado do modal funcional de nova sessão
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<AgendaItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSummary, setRescheduleSummary] = useState("");
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: "cancelled" | "missed" } | null>(null);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientId, setNewPatientId] = useState(params.get("patient") ?? "");
  const [newDate, setNewDate] = useState(today);
  const [newTime, setNewTime] = useState("10:00");
  const [newModality, setNewModality] = useState("Psicoterapia Individual (50 min)");
  const [newComplement, setNewComplement] = useState("");

  const { data: rawAgenda = [], isLoading, isError } = useQuery({
    queryKey: ["agenda"],
    queryFn: clinicalService.getAgenda,
    staleTime: 30_000,
  });
  const patientsQuery = useQuery({ queryKey: ["patients"], queryFn: clinicalService.getPatients, enabled: isApiMode });
  const refreshRecords = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["agenda"] }), queryClient.invalidateQueries({ queryKey: ["dashboard"] }), queryClient.invalidateQueries({ queryKey: ["patient"] }), queryClient.invalidateQueries({ queryKey: ["editor-sessions"] })]);
  };
  const createSession = useMutation({ mutationFn: recordService.createSession, onSuccess: refreshRecords });
  const rescheduleSession = useMutation({
    mutationFn: recordService.rescheduleSession,
    onSuccess: async (_session, vars) => {
      setRescheduleTarget(null);
      setSelectedDate(vars.date);
      setVisibleMonth(parseLocalDate(vars.date));
      await refreshRecords();
      notify({ type: "success", title: "Sessão remarcada", description: "O novo horário foi registrado no servidor." });
    },
  });
  const changeStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: "COMPLETED" | "CANCELLED" | "MISSED" }) => recordService.updateSessionStatus(id, status), onSuccess: refreshRecords });

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
        hasPendingReview: items.some((item) => item.status === "needs_review"),
      };
    });
  }, [selectedDate, sessionsByDate, today, visibleMonth]);

  const monthLabel = visibleMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const filteredItems = useMemo(() => {
    return agenda
      .filter((item) => item.date === selectedDate || item.date.includes(selectedDate))
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => item.patientName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [agenda, search, selectedDate, status]);

  const reviewItems = useMemo(() => {
    return [...agenda]
      .filter((item) => item.status === "needs_review")
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) || a.id.localeCompare(b.id))
      .slice(0, 4);
  }, [agenda]);

  const reviewCount = agenda.filter((item) => item.status === "needs_review").length;
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

  const confirmPendingStatus = () => {
    if (!pendingStatus) return;
    setPendingStatus(null);
    void handleUpdateStatus(pendingStatus.id, pendingStatus.status);
  };

  // Transição do ciclo de vida clínico
  const handleUpdateStatus = async (sessionId: string, newStatus: SessionStatus) => {
    if (isApiMode) {
      const statuses = { completed: "COMPLETED", cancelled: "CANCELLED", missed: "MISSED" } as const;
      if (!canSchedule || !(newStatus in statuses)) return;
      try {
        await changeStatus.mutateAsync({ id: sessionId, status: statuses[newStatus as keyof typeof statuses] });
        notify({ type: "success", title: "Atendimento atualizado", description: "O status foi registrado no servidor. Isso não assina a nota clínica." });
      } catch (error) { notify({ type: "error", title: "Falha ao atualizar sessão", description: apiErrorMessage(error, "O servidor não confirmou a alteração.") }); }
      return;
    }
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
  const handleCreateSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isApiMode) {
      if (!canSchedule || !newPatientId) return;
      try {
        await createSession.mutateAsync({ patientId: newPatientId, date: newDate, time: newTime, summary: newComplement });
        setIsNewSessionOpen(false); setSelectedDate(newDate); setVisibleMonth(parseLocalDate(newDate)); setNewComplement("");
        notify({ type: "success", title: "Sessão agendada", description: "O agendamento foi salvo no servidor." });
      } catch (error) { notify({ type: "error", title: "Falha no agendamento", description: apiErrorMessage(error, "O agendamento não foi salvo. Tente novamente.") }); }
      return;
    }
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
      complement: `${newModality}${newComplement ? `: ${newComplement}` : ""}`,
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
        title="Agenda clínica"
        description="Agendamentos e registro do status dos atendimentos. Os horários seguem o fuso deste navegador."
        action={
          canSchedule ? <Button onClick={() => setIsNewSessionOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova sessão
          </Button> : null
        }
      />
      {!isApiMode && <p className="mb-4 text-body-regular text-status-yellow-text">Demonstração: alterações de agenda nesta tela são temporárias e não são salvas no servidor.</p>}

      {/* Indicadores do Turno Clínico */}
      <MetricStrip>
        <MetricCard
          label="Sessões no dia selecionado"
          value={String(filteredItems.length)}
          delta={`${agenda.length} atendimentos registrados no total`}
        />
        <MetricCard
          label={isApiMode ? "Atendimentos concluídos" : "Em atendimento agora"}
          value={String(isApiMode ? agenda.filter((item) => item.status === "completed").length : inProgressCount)}
          delta={isApiMode ? "Conclusão não equivale à assinatura da nota" : inProgressCount > 0 ? "Sessão em curso no consultório" : "Nenhuma consulta ativa neste minuto"}
        />
        <MetricCard
          label={isApiMode ? "Agendamentos pendentes" : "Pendências de evolução"}
          value={String(isApiMode ? agenda.filter((item) => item.status === "draft").length : reviewCount)}
          delta={isApiMode ? "Atendimentos com status agendado" : "Aguardando registro ou revisão documental"}
        />
      </MetricStrip>

      {/* Alternância Dual Ergonômica (Linha do Tempo vs Matriz mensal - Lei de Hick) */}
      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-button-default bg-background-primary-default p-2">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "timeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeline")}
              className="gap-2 text-body-medium"
            >
              <Clock className="h-4 w-4" />
              Linha do tempo diária
            </Button>
            <Button
              variant={viewMode === "matrix" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("matrix")}
              className="gap-2 text-body-medium"
            >
              <Calendar className="h-4 w-4" />
              Matriz mensal
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-focus-ring bg-status-blue-background p-3.5 text-caption-1-regular text-status-blue-text">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              A data de hoje não possui agendamentos no demonstrativo. Existem sessões cadastradas em outras datas.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-caption-1-regular h-7 border-border-focus-ring text-status-blue-text hover:bg-status-blue-background"
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
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22.5rem)]">
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Input
                leadingIcon={RiSearchLine}
                aria-label="Buscar paciente na agenda"
                placeholder="Buscar paciente na agenda…"
                autoComplete="off"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-text-secondary shrink-0 hidden sm:block" />
              <Select
                className="w-full sm:w-56"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filtrar por ciclo de vida"
              >
                <option value="all">Todos os status</option>
                <option value="draft">Aguardando</option>
                {!isApiMode && <option value="in_progress">Em atendimento</option>}
                {!isApiMode && <option value="needs_review">Evolução pendente</option>}
                <option value="completed">{isApiMode ? "Atendimento concluído" : "Finalizada e assinada"}</option>
                <option value="cancelled">Cancelada</option>
                <option value="missed">Não compareceu</option>
              </Select>
            </div>
          </div>

          {/* MODO MATRIZ MENSAL (quando ativado pelo usuário para planejamento macro) */}
          {viewMode === "matrix" ? (
            <Card className="border-border-button-default">
              <CardContent className="p-4 md:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-title-3-semibold capitalize">{monthLabel}</h2>
                    <p className="mt-1 text-body-regular text-text-secondary">
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

                <div className="overflow-x-auto rounded-xl" tabIndex={0} aria-label="Calendário mensal, role horizontalmente em telas estreitas">
                <div className="grid min-w-[560px] grid-cols-7 gap-2">
                  {weekdays.map((weekday) => (
                    <div
                      key={weekday}
                      className="px-1 pb-1 text-center text-caption-1-semibold text-text-secondary"
                    >
                      {weekday}
                    </div>
                  ))}
                  {calendarDays.map((day) => (
                    <button
                      key={day.key}
                      aria-label={`Selecionar dia ${day.key}`}
                      aria-pressed={day.isSelected}
                      className={cn(
                        "focus-ring min-h-20 rounded-md border border-border-button-default bg-background-full p-2 text-left transition hover:border-border-focus-ring hover:bg-background-secondary-default",
                        !day.isCurrentMonth && "opacity-35",
                        day.isSelected && "border-border-focus-ring bg-status-blue-background shadow-sm",
                        day.hasPendingReview && "border-status-yellow-text",
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
                          "inline-flex h-6 w-6 items-center justify-center rounded-md text-caption-1-medium tabular-nums",
                          day.isToday && "bg-background-secondary-default text-text-primary text-body-semibold",
                          day.isSelected && "bg-accent-600 text-text-white text-body-semibold",
                        )}
                      >
                        {day.date.getDate()}
                      </span>
                      <span className="mt-1.5 block min-h-4 text-caption-1-regular text-text-secondary">
                        {day.sessionCount ? `${day.sessionCount} ${day.sessionCount === 1 ? "sessão" : "sessões"}` : ""}
                      </span>
                      {day.sessionCount ? (
                        <span className="mt-1 flex gap-1">
                          {Array.from({ length: Math.min(day.sessionCount, 3) }).map((_, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                "h-1 flex-1 rounded-full",
                                day.hasPendingReview ? "bg-status-yellow-background" : "bg-accent-600",
                              )}
                            />
                          ))}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* CABEÇALHO DO DIA SELECIONADO NA LINHA DO TEMPO */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-button-default pb-3 pt-1">
            <div>
              <h2 className="text-title-3-semibold first-letter:uppercase text-text-primary">
                {selectedDateLabel}
              </h2>
              <p className="text-caption-1-regular text-text-secondary mt-0.5">
                {filteredItems.length} {filteredItems.length === 1 ? "sessão agendada" : "sessões agendadas"} para este dia
              </p>
            </div>
          </div>

          {/* LISTA DA LINHA DO TEMPO CRONOLÓGICA (LEI DE JAKOB & FITTS) */}
          {isLoading ? <PageLoading label="Carregando agenda…" /> : isError ? <PageError description="Não foi possível carregar a agenda. Tente novamente." /> : filteredItems.length ? (
            <ul className="clinical-panel divide-y divide-separator-border">
              {filteredItems.map((item) => {
                const conf = isApiMode && item.status === "completed" ? { ...statusConfig.completed, label: "Atendimento concluído", description: "Status do atendimento registrado. A assinatura da nota é uma ação separada." } : statusConfig[item.status] || statusConfig.draft;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "p-4 first:rounded-t-3xl last:rounded-b-3xl",
                      item.status === "in_progress" && "bg-status-blue-background",
                      item.status === "needs_review" && "bg-status-yellow-background",
                    )}
                  >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                        {/* Bloco de Horário */}
                        <p className="shrink-0 text-headline-semibold tabular-nums lg:w-20">{item.time}</p>

                        {/* Conteúdo Clínico */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              className="focus-ring rounded-sm text-body-semibold text-text-primary underline-offset-2 hover:underline"
                              to={`/patients/${item.patientId}`}
                            >
                              {item.patientName}
                            </Link>

                            <Badge variant={conf.badgeVariant} className="text-caption-1-regular">
                              {conf.label}
                            </Badge>

                          </div>

                          <p className="mt-1 text-body-regular text-text-secondary">
                            {item.complement || "Sessão de psicoterapia, sem observações preliminares"}
                          </p>

                          <p className="mt-0.5 text-caption-1-regular text-text-secondary">
                            {conf.description}
                          </p>

                          {/* Ações de Transição Rápida do Ciclo de Vida Clínico */}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {!isApiMode && item.status === "draft" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-caption-1-regular gap-1.5"
                                onClick={() => handleUpdateStatus(item.id, "in_progress")}
                              >
                                <Play className="h-3.5 w-3.5 text-status-blue-text" />
                                Iniciar consulta
                              </Button>
                            ) : null}

                            {!isApiMode && item.status === "in_progress" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-caption-1-regular gap-1.5 border-status-yellow-text text-status-yellow-text hover:bg-status-yellow-background"
                                onClick={() => handleUpdateStatus(item.id, "needs_review")}
                              >
                                <ClipboardPenLine className="h-3.5 w-3.5" />
                                Encerrar e evoluir nota
                              </Button>
                            ) : null}

                            {!isApiMode && item.status === "needs_review" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-caption-1-regular gap-1.5 border-status-lime-text text-status-lime-text hover:bg-status-lime-background"
                                onClick={() => handleUpdateStatus(item.id, "completed")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Assinar e finalizar
                              </Button>
                            ) : null}

                            {isApiMode && canSchedule && item.professionalId === user?.id && <>
                              <ButtonLink to={`/editor?patient=${encodeURIComponent(item.patientId)}&session=${encodeURIComponent(item.id)}`} size="small">Abrir editor</ButtonLink>
                              {item.status === "draft" && <>
                                <Button size="sm" variant="outline" disabled={changeStatus.isPending} onClick={() => void handleUpdateStatus(item.id, "completed")}>Concluir atendimento</Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={rescheduleSession.isPending}
                                  onClick={() => {
                                    rescheduleSession.reset();
                                    setRescheduleTarget(item);
                                    setRescheduleDate(item.date);
                                    setRescheduleTime(item.time);
                                    setRescheduleSummary(!item.complement || item.complement === "Sem resumo registrado." ? "" : item.complement);
                                  }}
                                >
                                  Remarcar
                                </Button>
                                <Button size="sm" variant="outline" disabled={changeStatus.isPending} onClick={() => setPendingStatus({ id: item.id, status: "cancelled" })}>Cancelar sessão</Button>
                                <Button size="sm" variant="outline" disabled={changeStatus.isPending} onClick={() => setPendingStatus({ id: item.id, status: "missed" })}>Registrar falta</Button>
                              </>}
                            </>}
                            <ButtonLink
                              to={`/patients/${item.patientId}`}
                              size="small"
                            >
                              <span>Acessar prontuário</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </ButtonLink>
                          </div>
                        </div>
                      </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="Nenhuma sessão para esta data"
              description="Você não possui atendimentos agendados neste dia. Alterne as datas acima ou crie uma nova sessão."
            />
          )}
        </div>

        {/* Revisões documentais em ordem cronológica. */}
        <aside className="space-y-4">
          <h2 className="text-headline-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-status-yellow-text" />
            Revisões documentais do período
          </h2>
          {isLoading ? <PageLoading label="Carregando revisões…" /> : isError ? <PageError description="Não foi possível carregar as revisões documentais." /> : reviewItems.length > 0 ? (
            <ol className="clinical-panel divide-y divide-separator-border">
            {reviewItems.map((item) => {
              return (
                <li key={item.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-caption-1-medium text-text-secondary">
                          Evolução pendente
                        </span>
                        <Link
                          className="mt-0.5 block text-body-semibold hover:text-status-blue-text transition"
                          to={`/patients/${item.patientId}`}
                        >
                          {item.patientName}
                        </Link>
                      </div>
                    </div>

                    <p className="text-caption-1-regular text-text-secondary line-clamp-2">
                      {item.complement || "Registro da sessão aguardando revisão."}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-caption-1-regular text-text-secondary">
                      <span>{item.date} às {item.time}</span>
                      <Link
                        to={`/patients/${item.patientId}`}
                        className="text-status-blue-text hover:underline text-body-medium"
                      >
                        Prontuário
                      </Link>
                    </div>
                </li>
              );
            })}
            </ol>
          ) : (
            <div className="rounded-lg border border-border-button-default p-4 text-center text-caption-1-regular text-text-secondary">
              Nenhuma revisão documental pendente no período.
            </div>
          )}
        </aside>
      </section>

      {/* MODAL FUNCIONAL DE NOVA SESSÃO (LEI DE FITTS: CAMPOS GENEROSOS E FOCO ACESSÍVEL) */}
      <ConfirmDialog
        open={pendingStatus !== null}
        title={pendingStatus?.status === "missed" ? "Registrar falta nesta sessão?" : "Cancelar esta sessão?"}
        description="O novo status fica registrado no servidor e esta tela não oferece desfazer. A nota clínica não é alterada."
        confirmLabel={pendingStatus?.status === "missed" ? "Sim, registrar falta" : "Sim, cancelar sessão"}
        cancelLabel="Voltar"
        onConfirm={confirmPendingStatus}
        onClose={() => setPendingStatus(null)}
      />

      {isNewSessionOpen ? (
        <Dialog open onClose={() => setIsNewSessionOpen(false)} busy={createSession.isPending} title="Agendar nova sessão clínica">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="new-session-title" className="text-title-3-bold text-text-primary">
                  Agendar nova sessão clínica
                </h2>
                <p className="text-caption-1-regular text-text-secondary mt-0.5">
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
              {isApiMode ? <div className="space-y-2"><label htmlFor="agenda-patient">Paciente cadastrado</label><Select id="agenda-patient" required value={newPatientId} onChange={(event) => setNewPatientId(event.target.value)} disabled={patientsQuery.isLoading || createSession.isPending}><option value="">Selecione um paciente</option>{patientsQuery.data?.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</Select>{patientsQuery.isError ? <p role="alert">Não foi possível carregar os pacientes.</p> : !patientsQuery.isLoading && !patientsQuery.data?.length ? <ButtonLink to="/patients">Cadastrar paciente</ButtonLink> : null}</div> : <div className="space-y-1.5">
                <label htmlFor="patient-name-input" className="text-caption-1-semibold text-text-primary">
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
              </div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="session-date-input" className="text-caption-1-semibold text-text-primary">
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
                  <label htmlFor="session-time-input" className="text-caption-1-semibold text-text-primary">
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

              {!isApiMode && <div className="space-y-1.5">
                <label htmlFor="modality-select" className="text-caption-1-semibold text-text-primary">
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
              </div>}

              <div className="space-y-1.5">
                <label htmlFor="complement-textarea" className="text-caption-1-semibold text-text-primary">
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

              <div className="flex justify-end gap-3 pt-3 border-t border-border-button-default">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewSessionOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createSession.isPending || (isApiMode && (!newPatientId || patientsQuery.isError || patientsQuery.isLoading))}>
                  Confirmar Agendamento
                </Button>
              </div>
            </form>
        </Dialog>
      ) : null}

      {rescheduleTarget ? (
        <Dialog open onClose={() => setRescheduleTarget(null)} busy={rescheduleSession.isPending} title="Remarcar sessão clínica">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              rescheduleSession.mutate({
                id: rescheduleTarget.id,
                date: rescheduleDate,
                time: rescheduleTime,
                summary: rescheduleSummary,
              });
            }}
          >
            <div>
              <h2 className="text-title-3-semibold text-text-primary">Remarcar sessão clínica</h2>
              <p className="mt-1 text-caption-1-regular text-text-secondary">
                Paciente: {rescheduleTarget.patientName}. Conflitos de intervalo com outros atendimentos ativos serão verificados pelo servidor.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="reschedule-date-input" className="block text-body-medium">Nova data</label>
                <Input id="reschedule-date-input" type="date" required value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reschedule-time-input" className="block text-body-medium">Novo horário</label>
                <Input id="reschedule-time-input" type="time" required value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reschedule-summary-input" className="block text-body-medium">Observações da remarcação</label>
              <Textarea id="reschedule-summary-input" rows={3} value={rescheduleSummary} onChange={(e) => setRescheduleSummary(e.target.value)} />
            </div>
            {rescheduleSession.isError && (
              <p role="alert" className="text-body-regular text-text-error-primary">
                {apiErrorMessage(rescheduleSession.error, "Não foi possível remarcar para este horário.")}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-border-button-default">
              <Button type="button" variant="outline" disabled={rescheduleSession.isPending} onClick={() => setRescheduleTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={rescheduleSession.isPending || !rescheduleDate || !rescheduleTime}>
                {rescheduleSession.isPending ? "Remarcando…" : "Confirmar remarcação"}
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </>
  );
}
