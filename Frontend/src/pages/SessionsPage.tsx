import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionCard } from "@/components/sessions/SessionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePermissions } from "@/hooks/usePermissions";
import { clinicalService } from "@/services/clinicalService";
import { PageError, PageLoading } from "@/components/ui/page-state";

export function SessionsPage() {
  const { can } = usePermissions();
  const { data, isLoading, isError } = useQuery({ queryKey: ["dashboard"], queryFn: clinicalService.getDashboard });
  const sessions = data?.sessions ?? [];

  return (
    <>
      <PageHeader
        title="Sessões terapêuticas"
        description="Registro e histórico das sessões, sempre vinculadas individualmente ao paciente e ao seu prontuário."
        action={can("sessions:write") ? <Button><Plus className="h-4 w-4" /> Registrar sessão</Button> : null}
      />
      {isLoading ? <PageLoading label="Carregando sessões…" /> : isError ? <PageError description="Não foi possível consultar as sessões. Tente novamente." /> : sessions.length ? (
        <ol className="aelo-thread-list space-y-8">
          {sessions.map((session) => <li key={session.id} className="aelo-thread-item pb-4"><SessionCard session={session} /></li>)}
        </ol>
      ) : (
        <EmptyState title="Nenhuma sessão registrada" description="As sessões aparecerão aqui conforme forem registradas pela equipe clínica." />
      )}
    </>
  );
}
