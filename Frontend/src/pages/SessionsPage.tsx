import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionCard } from "@/components/sessions/SessionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePermissions } from "@/hooks/usePermissions";
import { clinicalService } from "@/services/clinicalService";

export function SessionsPage() {
  const { can } = usePermissions();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: clinicalService.getDashboard });
  const sessions = data?.sessions ?? [];

  return (
    <>
      <PageHeader
        title="Sessões terapêuticas"
        description="Registro e histórico das sessões, sempre vinculadas individualmente ao paciente e ao seu prontuário."
        action={can("sessions:write") ? <Button><Plus className="h-4 w-4" /> Registrar sessão</Button> : null}
      />
      {sessions.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessions.map((session) => <SessionCard key={session.id} session={session} />)}
        </div>
      ) : (
        <EmptyState title="Nenhuma sessão registrada" description="As sessões aparecerão aqui conforme forem registradas pela equipe clínica." />
      )}
    </>
  );
}
