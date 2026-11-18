import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { apiErrorMessage } from "@/services/apiError";
import { recordService, type PatientGrantRecord } from "@/services/recordService";

export function PatientAccessPanel({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [canEditOption, setCanEditOption] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<PatientGrantRecord | null>(null);

  const grantsQuery = useQuery({
    queryKey: ["patient-grants", patientId],
    queryFn: () => recordService.getPatientGrants(patientId),
  });

  const grants = grantsQuery.data ?? [];
  const isAdmin = user?.role === "ADMIN";
  const canEdit = Boolean(user?.role === "PSYCHOLOGIST" && grants.some((item) => String(item.user) === String(user.id) && item.can_edit));
  const canManageGrants = isAdmin || canEdit;

  const assigneesQuery = useQuery({
    queryKey: ["eligible-assignees", patientId],
    queryFn: () => recordService.getEligibleAssignees(patientId),
    enabled: grantDialogOpen && canManageGrants,
  });

  const selectedAssignee = assigneesQuery.data?.find((item) => String(item.id) === selectedUserId);
  const effectiveCanEdit = isAdmin ? true : selectedAssignee?.role === "INTERN" ? false : canEditOption;

  const refreshAccess = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["patient-grants", patientId] }),
      queryClient.invalidateQueries({ queryKey: ["patient-access", patientId] }),
      queryClient.invalidateQueries({ queryKey: ["eligible-assignees", patientId] }),
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] }),
    ]);
  };

  const grantMutation = useMutation({
    mutationFn: () => recordService.grantPatientAccess(patientId, { userId: selectedUserId, canEdit: effectiveCanEdit }),
    onSuccess: async () => {
      setGrantDialogOpen(false);
      setSelectedUserId("");
      await refreshAccess();
      notify({ type: "success", title: "Vínculo registrado", description: "A concessão de acesso clínico foi salva no servidor." });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (targetUserId: string | number) => recordService.revokePatientAccess(patientId, targetUserId),
    onSuccess: async () => {
      setRevokeTarget(null);
      await refreshAccess();
      notify({ type: "success", title: "Vínculo revogado", description: "O acesso clínico ao prontuário foi removido." });
    },
    onError: (error) => {
      setRevokeTarget(null);
      notify({ type: "error", title: "Não foi possível revogar", description: apiErrorMessage(error, "Deve permanecer ao menos um psicólogo responsável ativo.") });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <CardTitle className="text-headline-semibold">Vínculos de acesso clínico</CardTitle>
          <p className="mt-0.5 text-caption-1-regular text-text-secondary">
            {isAdmin
              ? "Administração operacional não lê prontuários; atribua o psicólogo responsável inicial."
              : "Profissionais e estagiários autorizados a consultar ou editar os registros deste paciente."}
          </p>
        </div>
        {canManageGrants && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedUserId("");
              setCanEditOption(true);
              grantMutation.reset();
              setGrantDialogOpen(true);
            }}
          >
            {isAdmin ? "Designar psicólogo" : "Conceder acesso"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {grantsQuery.isLoading ? (
          <p className="text-caption-1-regular text-text-secondary">Carregando vínculos…</p>
        ) : grantsQuery.isError ? (
          <p role="alert" className="text-caption-1-regular text-text-error-primary">Não foi possível consultar os vínculos deste paciente.</p>
        ) : grants.length === 0 ? (
          <p className="text-body-regular text-text-secondary">Nenhum profissional com acesso clínico atribuído ainda.</p>
        ) : (
          <ul className="divide-y divide-separator-border">
            {grants.map((grant) => (
              <li key={String(grant.id ?? grant.user)} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-medium text-text-primary">{grant.user_display || grant.user_username || `Usuário #${grant.user}`}</span>
                  {grant.user_role && <Badge variant="muted">{grant.user_role}</Badge>}
                  <Badge variant={grant.can_edit ? "success" : "default"}>
                    {grant.can_edit ? "Leitura e edição" : "Somente leitura"}
                  </Badge>
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={revokeMutation.isPending}
                    onClick={() => setRevokeTarget(grant)}
                  >
                    Revogar acesso
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {grantDialogOpen && (
        <Dialog open onClose={() => setGrantDialogOpen(false)} busy={grantMutation.isPending} title="Conceder vínculo clínico">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (selectedUserId) grantMutation.mutate();
            }}
          >
            <div>
              <h2 className="text-title-3-semibold text-text-primary">
                {isAdmin ? "Designar psicólogo responsável" : "Conceder acesso clínico"}
              </h2>
              <p className="mt-1 text-caption-1-regular text-text-secondary">
                {isAdmin
                  ? "A administração pode apenas designar um psicólogo ativo da clínica como responsável inicial."
                  : "Estagiários recebem exclusivamente acesso de leitura. Psicólogos podem receber leitura ou edição."}
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="grant-assignee-select" className="block text-body-medium">Profissional da clínica</label>
              <Select
                id="grant-assignee-select"
                required
                value={selectedUserId}
                disabled={assigneesQuery.isLoading || grantMutation.isPending}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                <option value="">Selecione um profissional</option>
                {(assigneesQuery.data ?? []).map((item) => (
                  <option key={String(item.id)} value={String(item.id)}>
                    {item.display_name} ({item.role})
                  </option>
                ))}
              </Select>
            </div>
            {!isAdmin && selectedAssignee?.role === "PSYCHOLOGIST" && (
              <label className="flex items-center gap-2 text-body-regular text-text-primary">
                <input
                  type="checkbox"
                  checked={canEditOption}
                  onChange={(event) => setCanEditOption(event.target.checked)}
                />
                Permitir edição clínica e delegação neste prontuário
              </label>
            )}
            {assigneesQuery.isError && (
              <p role="alert" className="text-body-regular text-text-error-primary">Não foi possível listar os profissionais elegíveis da clínica.</p>
            )}
            {grantMutation.isError && (
              <p role="alert" className="text-body-regular text-text-error-primary">
                {apiErrorMessage(grantMutation.error, "Não foi possível conceder o acesso.")}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-border-button-default">
              <Button type="button" variant="outline" disabled={grantMutation.isPending} onClick={() => setGrantDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!selectedUserId || grantMutation.isPending}>
                {grantMutation.isPending ? "Salvando…" : "Confirmar vínculo"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        title="Revogar acesso clínico?"
        description={`Remover o acesso de ${revokeTarget?.user_display || revokeTarget?.user_username || "este usuário"} ao prontuário deste paciente? Os registros já escritos permanecem preservados.`}
        confirmLabel="Sim, revogar acesso"
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) revokeMutation.mutate(revokeTarget.user);
        }}
      />
    </Card>
  );
}
