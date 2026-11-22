import { useState } from "react";
import { RiCloseLine, RiEyeLine, RiFileCodeLine, RiKey2Line, RiShieldCheckLine } from "@remixicon/react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/modal";
import type { AuditEvent } from "@/types/clinical";

export interface AuditTableProps {
  events: AuditEvent[];
  onSelectEvent?: (event: AuditEvent) => void;
}

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administração", PSYCHOLOGIST: "Psicologia", INTERN: "Estágio" };

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
            header: "Data e hora",
            render: (event) => <span className="text-caption-1-regular tabular-nums text-text-secondary">{event.date}</span>,
          },
          {
            key: "actor",
            header: "Usuário",
            render: (event) => <span className="text-body-medium text-text-primary">{event.actor}</span>,
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
                {ROLE_LABELS[event.role] ?? event.role}
              </Badge>
            ),
          },
          {
            key: "action",
            header: "Ação auditada",
            render: (event) => {
              const cat = getEventCategory(event);
              return (
                <div className="space-y-1">
                  <p className="text-body-medium text-text-primary">{event.action}</p>
                  <Badge variant={cat.variant} className="text-caption-2-regular">
                    {cat.label}
                  </Badge>
                </div>
              );
            },
          },
          {
            key: "entity",
            header: "Entidade",
            render: (event) => <span className="text-body-regular text-text-secondary">{event.entity}</span>,
          },
          {
            key: "ip",
            header: "Endereço IP",
            render: (event) => <code className="text-caption-1-regular text-text-secondary font-mono">{event.ip}</code>,
          },
          {
            key: "inspect",
            header: "Inspeção",
            className: "text-right",
            render: (event) => (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-caption-1-regular text-status-blue-text hover:text-status-blue-text"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInspect(event);
                }}
                aria-label={`Inspecionar evento ${event.id}`}
              >
                <RiEyeLine className="h-3.5 w-3.5" />
                Inspecionar
              </Button>
            ),
          },
        ]}
      />

      {/* MODAL / DRAWER DE DETALHES TÉCNICOS DO EVENTO DE AUDITORIA */}
      {activeEvent ? (
        <Dialog open onClose={() => setActiveEvent(null)} title="Inspeção técnica de auditoria" size="xl">
            <div className="flex items-start justify-between border-b border-border-button-default pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RiShieldCheckLine className="h-5 w-5 text-status-lime-text" />
                  <h2 id="audit-detail-title" className="text-title-3-bold text-text-primary">
                    Inspeção técnica de auditoria
                  </h2>
                </div>
                <p className="text-caption-1-regular text-text-secondary font-mono">
                  Identificador do registro: {activeEvent.id}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveEvent(null)}
                aria-label="Fechar detalhes técnicos"
              >
                <RiCloseLine className="h-4 w-4" />
              </Button>
            </div>

            {/* Metadados Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-caption-1-regular">
              <div className="rounded-lg border border-border-button-default bg-background-secondary-default p-3 space-y-1">
                <span className="text-text-secondary">Classificação e gravidade</span>
                <div>
                  <Badge variant={getEventCategory(activeEvent).variant} className="text-caption-1-regular">
                    {getEventCategory(activeEvent).label}
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border border-border-button-default bg-background-secondary-default p-3 space-y-1">
                <span className="text-text-secondary">Usuário responsável e perfil</span>
                <p className="text-body-semibold text-text-primary">
                  {activeEvent.actor}, <Badge variant="muted">{ROLE_LABELS[activeEvent.role] ?? activeEvent.role}</Badge>
                </p>
              </div>

              <div className="rounded-lg border border-border-button-default bg-background-secondary-default p-3 space-y-1">
                <span className="text-text-secondary">Data e fuso horário</span>
                <p className="text-body-semibold text-text-primary">{activeEvent.date}</p>
              </div>

              <div className="rounded-lg border border-border-button-default bg-background-secondary-default p-3 space-y-1">
                <span className="text-text-secondary">Origem do tráfego (IP)</span>
                <p className="font-mono text-text-primary">{activeEvent.ip}</p>
              </div>
            </div>

            {/* Ação e Entidade */}
            <div className="rounded-lg border border-border-button-default p-3.5 bg-background-secondary-default space-y-1">
              <span className="text-caption-1-regular text-text-secondary">Ação realizada</span>
              <p className="text-body-semibold text-text-primary">{activeEvent.action}</p>
              <span className="text-caption-1-regular text-text-secondary mt-2 block">Entidade afetada</span>
              <p className="text-caption-1-regular text-text-primary font-mono">{activeEvent.entity}</p>
            </div>

            {/* Hash Criptográfico SHA-256 (Cadeia de Custódia) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-caption-1-semibold text-text-primary">
                <RiKey2Line className="h-3.5 w-3.5 text-status-lime-text" />
                Hash de integridade (SHA-256):
              </div>
              <div className="rounded-md border border-status-lime-text bg-status-lime-background p-2.5 font-mono text-caption-1-regular break-all text-status-lime-text select-all">
                {activeEvent.sha256 || "Hash não informado pelo servidor"}
              </div>
              <p className="text-caption-1-regular text-text-secondary">
                A presença do hash não comprova, por si só, a integridade da cadeia. Execute a verificação de auditoria no servidor.
              </p>
            </div>

            {/* Payload Técnico JSON */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-caption-1-semibold text-text-primary">
                <RiFileCodeLine className="h-3.5 w-3.5 text-status-blue-text" />
                Dados de rastreabilidade:
              </div>
              <pre className="max-h-48 overflow-y-auto rounded-lg border border-border-button-default bg-background-secondary-default p-3 text-caption-1-regular font-mono text-text-primary">
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

            <div className="flex justify-end pt-3 border-t border-border-button-default">
              <Button onClick={() => setActiveEvent(null)}>
                Concluir inspeção
              </Button>
            </div>
        </Dialog>
      ) : null}
    </>
  );
}
