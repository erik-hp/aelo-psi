import { ShieldCheck, UserCog } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { isApiMode } from "@/services/runtime";
import { useQuery } from "@tanstack/react-query";
import { recordService } from "@/services/recordService";
import { PageError, PageLoading } from "@/components/ui/page-state";

function StaffDirectory() {
  const query = useQuery({ queryKey: ["users"], queryFn: recordService.getUsers });
  if (query.isLoading) return <PageLoading />;
  if (query.isError) return <PageError description="Não foi possível consultar a equipe. Esta ação exige acesso administrativo." />;
  const staff = query.data ?? [];
  return <div className="space-y-4"><p className="text-body-regular text-text-secondary">Equipe cadastrada na clínica. Criação e alteração de contas ainda não estão disponíveis nesta tela.</p>{staff.length ? <DataTable data={staff} getRowKey={(item) => String(item.id)} columns={[
    { key: "name", header: "Nome", render: (item) => `${item.first_name} ${item.last_name}`.trim() || item.username },
    { key: "email", header: "E-mail", render: (item) => item.email },
    { key: "role", header: "Perfil", render: (item) => <Badge>{item.role}</Badge> },
    { key: "status", header: "Status", render: (item) => <Badge variant={item.is_active ? "success" : "muted"}>{item.is_active ? "Ativo" : "Inativo"}</Badge> },
  ]} /> : <EmptyState title="Nenhum profissional cadastrado" description="A listagem considera somente a equipe autorizada da clínica." />}</div>;
}

const users = [
  { id: "u-1", name: "Dra. Marina Costa", email: "admin@aelo.com", role: "ADMIN", status: "ativo" },
  { id: "u-2", name: "Dr. Rafael Nunes", email: "psi@aelo.com", role: "PSYCHOLOGIST", status: "ativo" },
  { id: "u-3", name: "Lia Andrade", email: "intern@aelo.com", role: "INTERN", status: "limitado" },
];

export function UsersPage() {
  return (
    <>
      <PageHeader title="Usuários" description="Gestão de perfis, permissões e acesso à plataforma clínica." />
      {isApiMode ? <StaffDirectory /> : <>
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
