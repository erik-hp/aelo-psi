import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  KeyRound,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { AuditTable, getEventCategory } from "@/components/audit/AuditTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Select } from "@/components/ui/select";
import { clinicalService } from "@/services/clinicalService";

export function AuditPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: auditEvents = [], isLoading, isError } = useQuery({
    queryKey: ["audit-events"],
    queryFn: clinicalService.getAuditEvents,
    staleTime: 30_000,
  });

  const filteredEvents = useMemo(() => {
    return auditEvents.filter((event) => {
      const text = `${event.actor} ${event.action} ${event.entity} ${event.ip}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesRole = role === "all" || event.role === role;

      const cat = getEventCategory(event);
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "security" && cat.variant === "critical") ||
        (categoryFilter === "signature" && cat.variant === "success") ||
        (categoryFilter === "clinical" && (cat.variant === "warning" || cat.variant === "muted"));

      return matchesSearch && matchesRole && matchesCategory;
    });
  }, [auditEvents, search, role, categoryFilter]);

  const securityAlertCount = auditEvents.filter((event) => getEventCategory(event).variant === "critical").length;
  const signatureCount = auditEvents.filter((event) => getEventCategory(event).variant === "success").length;

  return (
    <>
      <PageHeader
        title="Trilha de Auditoria & Conformidade LGPD"
        description="Rastreabilidade criptográfica imutável, cadeia de custódia de dados de saúde mental e controle de acessos (LGPD Art. 11/20 e CFP nº 01/2009)."
      />

      {/* Indicadores de Segurança e Conformidade */}
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Total de eventos auditados"
          value={String(auditEvents.length)}
          delta="Registros com hash SHA-256"
          icon={FileText}
        />
        <MetricCard
          label="Assinaturas criptográficas"
          value={String(signatureCount)}
          delta="Chave P-256 / Validação ética"
          icon={KeyRound}
          tone="cyan"
        />
        <MetricCard
          label="Alertas de segurança LGPD"
          value={String(securityAlertCount)}
          delta={securityAlertCount > 0 ? "Acessos sensíveis monitorados" : "Nenhum incidente detectado"}
          icon={ShieldAlert}
          tone={securityAlertCount > 0 ? "amber" : undefined}
        />
      </section>

      {/* Barra de Filtros */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar ação, usuário, entidade ou endereço IP..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Pesquisar eventos"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            aria-label="Filtrar por perfil"
            className="w-full sm:w-44"
          >
            <option value="all">Todos os perfis</option>
            <option value="ADMIN">ADMIN</option>
            <option value="PSYCHOLOGIST">PSYCHOLOGIST</option>
            <option value="INTERN">INTERN</option>
          </Select>

          <Select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filtrar por classificação"
            className="w-full sm:w-48"
          >
            <option value="all">Todas as categorias</option>
            <option value="security">Alertas de Segurança (LGPD)</option>
            <option value="signature">Assinaturas Criptográficas</option>
            <option value="clinical">Consultas e Aditamentos</option>
          </Select>
        </div>
      </div>

      {/* Tabela de Auditoria com Loading Progressivo (Limite de Doherty) */}
      {isLoading ? (
        <div className="space-y-3">
          <LoadingSkeleton className="h-12 w-full" />
          <LoadingSkeleton className="h-16 w-full" />
          <LoadingSkeleton className="h-16 w-full" />
          <LoadingSkeleton className="h-16 w-full" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar a trilha de auditoria.
        </p>
      ) : filteredEvents.length > 0 ? (
        <AuditTable events={filteredEvents} />
      ) : (
        <EmptyState
          title="Nenhum evento localizado"
          description="Nenhum registro de auditoria corresponde aos filtros de pesquisa ou perfil selecionados."
        />
      )}
    </>
  );
}
