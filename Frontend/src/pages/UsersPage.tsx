import { ShieldCheck, UserCog } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { isApiMode } from "@/services/runtime";

const users = [
  { id: "u-1", name: "Dra. Marina Costa", email: "admin@aelo.com", role: "ADMIN", status: "ativo" },
  { id: "u-2", name: "Dr. Rafael Nunes", email: "psi@aelo.com", role: "PSYCHOLOGIST", status: "ativo" },
  { id: "u-3", name: "Lia Andrade", email: "intern@aelo.com", role: "INTERN", status: "limitado" },
];

export function UsersPage() {
  return (
    <>
      <PageHeader title="Usuários" description="Gestão de perfis, permissões e acesso à plataforma clínica." />
      {isApiMode ? <EmptyState title="Gestão de usuários indisponível" description="A gestão de usuários ainda não está integrada a esta tela." /> : <>
      <div className="mb-4"><Badge variant="muted">Demonstração com dados sintéticos</Badge></div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <MetricCard label="Usuários ativos" value="3" icon={UserCog} />
        <MetricCard label="Perfis com auditoria" value="100%" icon={ShieldCheck} tone="cyan" />
      </div>
      <DataTable
        data={users}
        getRowKey={(user) => user.id}
        columns={[
          { key: "name", header: "Nome", render: (user) => user.name },
          { key: "email", header: "Email", render: (user) => user.email },
          { key: "role", header: "Perfil", render: (user) => <Badge>{user.role}</Badge> },
          { key: "status", header: "Status", render: (user) => <Badge variant="success">{user.status}</Badge> },
        ]}
      />
      </>}
    </>
  );
}
