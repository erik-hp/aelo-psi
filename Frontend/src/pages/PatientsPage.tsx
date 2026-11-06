import { RiSearchLine } from "@remixicon/react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { PatientCard } from "@/components/patients/PatientCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { clinicalService } from "@/services/clinicalService";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreatePatientDialog } from "@/components/patients/CreatePatientDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { isApiMode } from "@/services/runtime";
import { PageError, PageLoading } from "@/components/ui/page-state";

export function PatientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const { can } = usePermissions();
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("all");
  const debouncedSearch = useDebouncedValue(search);
  const { data: patients = [], isLoading, isError } = useQuery({ queryKey: ["patients"], queryFn: clinicalService.getPatients });
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
        description="Cadastro e acesso ao histórico dos pacientes autorizados."
        action={can("patients:write") ? <Button disabled={!isApiMode} title={!isApiMode ? "O cadastro exige conexão com a API." : undefined} onClick={() => setCreating(true)}>Adicionar paciente</Button> : null}
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Input leadingIcon={RiSearchLine} aria-label="Buscar por nome" placeholder="Buscar por nome" value={search} onChange={(event) => setSearchParams(event.target.value ? { search: event.target.value } : {}, { replace: true })} />
        </div>
        <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar status">
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="watch">Em atenção</option>
          <option value="inactive">Inativos</option>
        </Select>
      </div>
      {isLoading ? <PageLoading label="Carregando pacientes…" /> : isError ? <PageError description="Não foi possível consultar os pacientes. Tente novamente." /> : filtered.length ? (
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
      <div className="mt-6 flex justify-end gap-2 text-body-regular text-text-secondary">
        {filtered.length} registros encontrados
      </div>
      {creating && <CreatePatientDialog onClose={() => setCreating(false)} />}
    </>
  );
}
