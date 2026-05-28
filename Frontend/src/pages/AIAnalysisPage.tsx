import { Brain } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AIAnalysisCard } from "@/components/analysis/AIAnalysisCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { clinicalService } from "@/services/clinicalService";

export function AIAnalysisPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: clinicalService.getDashboard });
  const analyses = data?.analyses ?? [];

  return (
    <>
      <PageHeader
        title="IA assistiva"
        description="Sugestões auxiliares para revisão profissional. A interface não executa diagnóstico automático nem substitui decisão clínica."
      />
      {analyses.length ? (
        <div className="space-y-5">
          {analyses.map((analysis) => <AIAnalysisCard key={analysis.id} analysis={analysis} />)}
        </div>
      ) : (
        <EmptyState icon={Brain} title="Nenhuma análise pendente" description="Solicitações de análise aparecerão aqui para validação humana." />
      )}
    </>
  );
}
