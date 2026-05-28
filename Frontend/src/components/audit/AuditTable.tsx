import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import type { AuditEvent } from "@/types/clinical";

export function AuditTable({ events }: { events: AuditEvent[] }) {
  return (
    <DataTable
      data={events}
      getRowKey={(event) => event.id}
      columns={[
        { key: "date", header: "Data", render: (event) => event.date },
        { key: "actor", header: "Usuário", render: (event) => event.actor },
        { key: "role", header: "Perfil", render: (event) => <Badge variant="muted">{event.role}</Badge> },
        { key: "action", header: "Ação", render: (event) => event.action },
        { key: "entity", header: "Entidade", render: (event) => event.entity },
        { key: "ip", header: "IP", render: (event) => event.ip },
      ]}
    />
  );
}
