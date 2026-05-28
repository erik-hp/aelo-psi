import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { PatientCard } from "@/components/patients/PatientCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { clinicalService } from "@/services/clinicalService";

export function PatientsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const debouncedSearch = useDebouncedValue(search);
  const { data: patients = [] } = useQuery({ queryKey: ["patients"], queryFn: clinicalService.getPatients });
  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: clinicalService.getDashboard });
  const { data: agenda = [] } = useQuery({ queryKey: ["agenda"], queryFn: clinicalService.getAgenda });

  const filtered = useMemo(() => {
    return patients.filter((patient) => {
      const matchesText = patient.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = status === "all" || patient.status === status;
      return matchesText && matchesStatus;
    });
  }, [patients, debouncedSearch, status]);

  return (
    <>
      <PageHeader
        title="Pacientes"
        description="Dados clínicos, tempo de tratamento, periodicidade, sessões realizadas/agendadas e leitura dos prontuários analisados."
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar status">
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="watch">Em atenção</option>
          <option value="inactive">Inativos</option>
        </Select>
      </div>
      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              completedSessions={(dashboard?.sessions ?? []).filter((session) => session.patientId === patient.id && session.status === "completed").length}
              scheduledSessions={agenda.filter((item) => item.patientId === patient.id && item.status === "draft").length}
              analysis={(dashboard?.analyses ?? []).find((analysis) => analysis.patientId === patient.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum paciente encontrado" description="Ajuste os filtros ou cadastre um novo paciente quando permitido pelo seu perfil." />
      )}
      <div className="mt-6 flex justify-end gap-2 text-sm text-muted-foreground">
        Página 1 de 1 • {filtered.length} registros
      </div>
    </>
  );
}
