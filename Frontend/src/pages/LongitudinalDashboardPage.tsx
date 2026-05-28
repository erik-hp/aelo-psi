import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Select } from "@/components/ui/select";
import { clinicalService } from "@/services/clinicalService";

export function LongitudinalDashboardPage() {
  const { data: patients = [] } = useQuery({ queryKey: ["patients"], queryFn: clinicalService.getPatients });
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const patientId = selectedPatientId || patients[0]?.id || "";
  const patient = useMemo(() => patients.find((item) => item.id === patientId), [patientId, patients]);
  const { data = [] } = useQuery({
    queryKey: ["patient-longitudinal", patientId],
    queryFn: () => clinicalService.getPatientLongitudinal(patientId),
    enabled: Boolean(patientId),
  });

  return (
    <>
      <PageHeader
        title="Longitudinal por paciente"
        description="Métricas narrativas, frequência de sessões, aderência e atenção calculadas individualmente para cada paciente."
      />
      <div className="mb-5 max-w-sm">
        <Select value={patientId} onChange={(event) => setSelectedPatientId(event.target.value)} aria-label="Selecionar paciente">
          {patients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
      </div>
      {patient ? <p className="mb-4 text-sm text-muted-foreground">Paciente selecionado: {patient.name}</p> : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Tendência clínica" description="Intensidade ansiosa no período do paciente." data={data} dataKey="anxiety" />
        <ChartCard title="Aderência terapêutica" description="Presença e tarefas combinadas para este paciente." data={data} dataKey="adherence" />
        <ChartCard title="Métrica narrativa" description="Coerência e organização narrativa por mês." data={data} dataKey="narrative" />
        <ChartCard title="Índice de atenção IA" description="Leitura assistiva das notas e prontuários do paciente." data={data} dataKey="attention" />
      </div>
    </>
  );
}
