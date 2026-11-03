import { useState } from "react";
import { Eye, FileCode2, KeyRound, ShieldCheck, X } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AuditEvent } from "@/types/clinical";

export interface AuditTableProps {
  events: AuditEvent[];
  onSelectEvent?: (event: AuditEvent) => void;
}

export function getEventCategory(event: AuditEvent): {
  variant: "default" | "success" | "warning" | "muted" | "critical";
  label: string;
} {
  const text = `${event.category || ""} ${event.action} ${event.entity}`.toLowerCase();

  if (
    event.category === "SECURITY_ALERT" ||
    text.includes("alerta") ||
    text.includes("segurança") ||
    text.includes("não autorizada") ||
    text.includes("bloqueada") ||
    text.includes("art. 11")
  ) {
    return { variant: "critical", label: "Segurança / LGPD Art. 11" };
  }

  if (
    event.category === "DIGITAL_SIGNATURE" ||
    text.includes("assinatura") ||
    text.includes("p-256") ||
    text.includes("criptográfica") ||
    text.includes("validou")
  ) {
    return { variant: "success", label: "Assinatura P-256 / SHA-256" };
  }

  if (event.category === "UPDATE" || text.includes("atualizou") || text.includes("aditamento")) {
    return { variant: "warning", label: "Aditamento / Alteração" };
  }

  if (event.category === "RECORD_VIEW" || text.includes("visualizou") || text.includes("consulta")) {
    return { variant: "muted", label: "Consulta de Prontuário" };
  }

  return { variant: "default", label: "Evento de Auditoria" };
}

export function AuditTable({ events, onSelectEvent }: AuditTableProps) {
  const [activeEvent, setActiveEvent] = useState<AuditEvent | null>(null);

  const handleInspect = (event: AuditEvent) => {
    setActiveEvent(event);
    onSelectEvent?.(event);
  };

  return (
    <>
      <DataTable
        data={events}
        getRowKey={(event) => event.id}
        onRowClick={handleInspect}
        columns={[
          {
            key: "date",
            header: "Data / Hora",
            render: (event) => <span className="font-mono text-xs text-muted-foreground">{event.date}</span>,
          },
          {
            key: "actor",
            header: "Usuário",
            render: (event) => <span className="font-medium text-foreground">{event.actor}</span>,
          },
          {
            key: "role",
            header: "Perfil",
            render: (event) => (
              <Badge
                variant={
                  event.role === "ADMIN"
                    ? "default"
                    : event.role === "PSYCHOLOGIST"
                    ? "success"
                    : "muted"
                }
              >
                {event.role}
              </Badge>
            ),
          },
          {
            key: "action",
            header: "Ação Auditada",
            render: (event) => {
              const cat = getEventCategory(event);
              return (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{event.action}</p>
                  <Badge variant={cat.variant} className="text-[10px]">
                    {cat.label}
                  </Badge>
                </div>
              );
            },
          },
          {
            key: "entity",
            header: "Entidade",
            render: (event) => <span className="text-sm text-muted-foreground">{event.entity}</span>,
          },
          {
            key: "ip",
            header: "Endereço IP",
            render: (event) => <code className="text-xs text-muted-foreground font-mono">{event.ip}</code>,
          },
          {
            key: "inspect",
            header: "Inspeção",
            className: "text-right",
            render: (event) => (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-primary hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInspect(event);
                }}
                aria-label={`Inspecionar evento ${event.id}`}
              >
                <Eye className="h-3.5 w-3.5" />
                Inspecionar
              </Button>
            ),
          },
        ]}
      />

      {/* MODAL / DRAWER DE DETALHES TÉCNICOS DO EVENTO DE AUDITORIA */}
      {activeEvent ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-detail-title"
        >
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-border/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                  <h2 id="audit-detail-title" className="text-lg font-bold text-foreground">
                    Inspeção Técnica de Auditoria Imutável
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Identificador do registro: {activeEvent.id}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveEvent(null)}
                aria-label="Fechar detalhes técnicos"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Metadados Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
                <span className="text-muted-foreground">Classificação & Gravidade</span>
                <div>
                  <Badge variant={getEventCategory(activeEvent).variant} className="text-xs">
                    {getEventCategory(activeEvent).label}
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
                <span className="text-muted-foreground">Usuário Responsável & Perfil</span>
                <p className="font-semibold text-foreground">
                  {activeEvent.actor} • <Badge variant="muted">{activeEvent.role}</Badge>
                </p>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
                <span className="text-muted-foreground">Data e Fuso Horário</span>
                <p className="font-semibold text-foreground">{activeEvent.date}</p>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
                <span className="text-muted-foreground">Origem do Tráfego (IP)</span>
                <p className="font-mono text-foreground">{activeEvent.ip}</p>
              </div>
            </div>

            {/* Ação e Entidade */}
            <div className="rounded-lg border border-border p-3.5 bg-secondary/20 space-y-1">
              <span className="text-xs text-muted-foreground">Ação Realizada</span>
              <p className="text-sm font-semibold text-foreground">{activeEvent.action}</p>
              <span className="text-xs text-muted-foreground mt-2 block">Entidade Afetada</span>
              <p className="text-xs text-foreground font-mono">{activeEvent.entity}</p>
            </div>

            {/* Hash Criptográfico SHA-256 (Cadeia de Custódia) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <KeyRound className="h-3.5 w-3.5 text-accent" />
                Hash Criptográfico de Integridade (SHA-256):
              </div>
              <div className="rounded-md border border-accent/30 bg-accent/5 p-2.5 font-mono text-[11px] break-all text-accent select-all">
                {activeEvent.sha256 || "Hash não informado pelo servidor"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                A presença do hash não comprova, por si só, a integridade da cadeia. Execute a verificação de auditoria no servidor.
              </p>
            </div>

            {/* Payload Técnico JSON */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <FileCode2 className="h-3.5 w-3.5 text-primary" />
                Payload de Rastreabilidade Estruturado:
              </div>
              <pre className="max-h-48 overflow-y-auto rounded-lg border border-border bg-secondary/60 p-3 text-[11px] font-mono text-foreground leading-relaxed">
                {JSON.stringify(
                  activeEvent.payload || {
                    event_id: activeEvent.id,
                    actor: activeEvent.actor,
                    role: activeEvent.role,
                    action: activeEvent.action,
                    entity: activeEvent.entity,
                    ip_address: activeEvent.ip,
                    timestamp: activeEvent.date,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button onClick={() => setActiveEvent(null)}>
                Concluir Inspeção
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
