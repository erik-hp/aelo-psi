import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CircleDollarSign, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { clinicalService } from "@/services/clinicalService";
import { isApiMode } from "@/services/runtime";
import type { FinancialRecord } from "@/types/clinical";
import { EmptyState } from "@/components/ui/empty-state";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function FinancePage() {
  const { data = [] } = useQuery({ queryKey: ["finance"], queryFn: clinicalService.getFinance });

  const totals = useMemo(() => {
    return data.reduce(
      (acc, record) => ({
        gross: acc.gross + record.sessionValue,
        fees: acc.fees + record.platformFee,
        net: acc.net + record.netValue,
      }),
      { gross: 0, fees: 0, net: 0 },
    );
  }, [data]);

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Controle de sessões, repasses e valores líquidos para os agentes psicológicos."
      />
      {isApiMode ? <EmptyState title="Financeiro indisponível" description="O módulo financeiro ainda não está integrado à API." /> : (
      <>
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Valor bruto" value={money.format(totals.gross)} icon={CircleDollarSign} />
        <MetricCard label="Taxas da plataforma" value={money.format(totals.fees)} icon={WalletCards} tone="amber" />
        <MetricCard label="Repasse líquido" value={money.format(totals.net)} icon={Banknote} tone="cyan" />
      </section>
      <DataTable<FinancialRecord>
        data={data}
        getRowKey={(record) => record.id}
        columns={[
          { key: "psychologist", header: "Agente psicológico", render: (record) => record.psychologist },
          { key: "patientName", header: "Paciente", render: (record) => record.patientName },
          { key: "date", header: "Data", render: (record) => record.date },
          { key: "sessionValue", header: "Sessão", render: (record) => money.format(record.sessionValue) },
          { key: "netValue", header: "Repasse", render: (record) => money.format(record.netValue) },
          {
            key: "status",
            header: "Status",
            render: (record) => <Badge variant={record.status === "paid" ? "success" : record.status === "overdue" ? "warning" : "muted"}>{record.status}</Badge>,
          },
        ]}
      />
      </>
      )}
    </>
  );
}
