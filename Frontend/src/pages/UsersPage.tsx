import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard, MetricStrip } from "@/components/dashboard/MetricCard";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageError, PageLoading } from "@/components/ui/page-state";
import { useToast } from "@/hooks/useToast";
import { apiErrorMessage } from "@/services/apiError";
import { recordService, type StaffRecord } from "@/services/recordService";
import { isApiMode } from "@/services/runtime";

function StaffDirectory({
  creating,
  onCloseCreate,
}: {
  creating: boolean;
  onCloseCreate: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"PSYCHOLOGIST" | "INTERN">("PSYCHOLOGIST");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [password, setPassword] = useState("");
  const [toggleTarget, setToggleTarget] = useState<StaffRecord | null>(null);

  const query = useQuery({ queryKey: ["users"], queryFn: recordService.getUsers });

  const createStaff = useMutation({
    mutationFn: () =>
      recordService.createStaffUser({
        username,
        email,
        firstName,
        lastName,
        role,
        licenseNumber,
        password,
      }),
    onSuccess: async () => {
      setUsername("");
      setEmail("");
      setFirstName("");
      setLastName("");
      setLicenseNumber("");
      setPassword("");
      onCloseCreate();
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      notify({ type: "success", title: "Profissional cadastrado", description: "A conta foi criada e vinculada à clínica ativa." });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, nextActive }: { id: string | number; nextActive: boolean }) =>
      recordService.setStaffActive(id, nextActive),
    onSuccess: async (_updated, vars) => {
      setToggleTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      notify({
        type: "success",
        title: vars.nextActive ? "Conta reativada" : "Conta desativada",
        description: vars.nextActive
          ? "O acesso operacional à clínica foi restabelecido."
          : "Novos logins e renovações desta conta foram bloqueados, preservando a autoria histórica.",
      });
    },
    onError: (error) => {
      setToggleTarget(null);
      notify({ type: "error", title: "Falha ao alterar status", description: apiErrorMessage(error, "Não foi possível atualizar a conta.") });
    },
  });

  if (query.isLoading) return <PageLoading />;
  if (query.isError) return <PageError description="Não foi possível consultar a equipe. Esta ação exige acesso administrativo." />;
  const staff = query.data ?? [];

  return (
    <div className="space-y-4">
      <p className="text-body-regular text-text-secondary">
        Equipe clínica vinculada à unidade atual. Contas administrativas são provisionadas fora desta API por segurança.
      </p>
      {staff.length ? (
        <DataTable
          data={staff}
          getRowKey={(item) => String(item.id)}
          columns={[
            { key: "name", header: "Nome", render: (item) => `${item.first_name} ${item.last_name}`.trim() || item.username },
            { key: "email", header: "E-mail", render: (item) => item.email || "—" },
            { key: "role", header: "Perfil", render: (item) => <Badge>{item.role}</Badge> },
            {
              key: "status",
              header: "Status",
              render: (item) => (
                <Badge variant={item.is_active ? "success" : "muted"}>
                  {item.is_active ? "Ativo" : "Inativo"}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "Ações",
              className: "text-end",
              render: (item) => (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={toggleActive.isPending}
                  onClick={() => setToggleTarget(item)}
                >
                  {item.is_active ? "Desativar conta" : "Reativar conta"}
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState title="Nenhum profissional cadastrado" description="Cadastre psicólogos ou estagiários para habilitar agendamentos e vínculos clínicos." />
      )}

      {creating && (
        <Dialog open onClose={onCloseCreate} busy={createStaff.isPending} title="Cadastrar membro da equipe">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createStaff.mutate();
            }}
          >
            <div>
              <h2 className="text-title-3-semibold text-text-primary">Cadastrar membro da equipe</h2>
              <p className="mt-1 text-caption-1-regular text-text-secondary">
                A conta é criada na sua clínica sem acesso automático a prontuários existentes.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="staff-first-name" className="block text-body-medium">Nome</label>
                <Input id="staff-first-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="staff-last-name" className="block text-body-medium">Sobrenome</label>
                <Input id="staff-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="staff-username" className="block text-body-medium">Usuário de acesso</label>
                <Input id="staff-username" required autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="staff-email" className="block text-body-medium">E-mail institucional</label>
                <Input id="staff-email" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="staff-role" className="block text-body-medium">Perfil</label>
                <Select id="staff-role" value={role} onChange={(e) => setRole(e.target.value as "PSYCHOLOGIST" | "INTERN")}>
                  <option value="PSYCHOLOGIST">Psicólogo(a)</option>
                  <option value="INTERN">Estagiário(a)</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="staff-license" className="block text-body-medium">Registro / CRP (opcional)</label>
                <Input id="staff-license" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="Ex.: CRP 11/00000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="staff-password" className="block text-body-medium">Senha inicial (mínimo 8 caracteres)</label>
              <Input id="staff-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {createStaff.isError && (
              <p role="alert" className="text-body-regular text-text-error-primary">
                {apiErrorMessage(createStaff.error, "Verifique usuário, e-mail e complexidade da senha.")}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-border-button-default">
              <Button type="button" variant="outline" disabled={createStaff.isPending} onClick={onCloseCreate}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createStaff.isPending || !username.trim() || !email.trim() || password.length < 8}>
                {createStaff.isPending ? "Cadastrando…" : "Confirmar cadastro"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      <ConfirmDialog
        open={toggleTarget !== null}
        title={toggleTarget?.is_active ? "Desativar conta profissional?" : "Reativar conta profissional?"}
        description={
          toggleTarget?.is_active
            ? "A desativação impede novos logins e renovações de token desta conta, sem apagar prontuários já registrados."
            : "A conta voltará a autenticar na clínica com os vínculos existentes."
        }
        confirmLabel={toggleTarget?.is_active ? "Sim, desativar" : "Sim, reativar"}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => {
          if (toggleTarget) toggleActive.mutate({ id: toggleTarget.id, nextActive: !toggleTarget.is_active });
        }}
      />
    </div>
  );
}

const demoUsers = [
  { id: "u-1", name: "Dra. Marina Costa", email: "admin@aelo.com", role: "ADMIN", status: "ativo" },
  { id: "u-2", name: "Dr. Rafael Nunes", email: "psi@aelo.com", role: "PSYCHOLOGIST", status: "ativo" },
  { id: "u-3", name: "Lia Andrade", email: "intern@aelo.com", role: "INTERN", status: "limitado" },
];

export function UsersPage() {
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Gestão de perfis, permissões e acesso à plataforma clínica."
        action={isApiMode ? <Button onClick={() => setCreating(true)}>Cadastrar profissional</Button> : null}
      />
      {isApiMode ? (
        <StaffDirectory creating={creating} onCloseCreate={() => setCreating(false)} />
      ) : (
        <>
          <div className="mb-4"><Badge variant="muted">Demonstração com dados sintéticos</Badge></div>
          <MetricStrip className="mb-6">
            <MetricCard label="Usuários ativos" value="3" />
            <MetricCard label="Perfis com auditoria" value="100%" />
          </MetricStrip>
          <DataTable
            data={demoUsers}
            getRowKey={(user) => user.id}
            columns={[
              { key: "name", header: "Nome", render: (user) => user.name },
              { key: "email", header: "Email", render: (user) => user.email },
              { key: "role", header: "Perfil", render: (user) => <Badge>{user.role}</Badge> },
              { key: "status", header: "Status", render: (user) => <Badge variant="success">{user.status}</Badge> },
            ]}
          />
        </>
      )}
    </>
  );
}
