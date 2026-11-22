import { useMutation } from "@tanstack/react-query";
import { RiBrainLine, RiCpuLine, RiNodeTree, RiSparklingLine } from "@remixicon/react";
import { NarrativeEditor } from "@/components/forms/NarrativeEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/useToast";
import { clinicalService } from "@/services/clinicalService";
import { isApiMode } from "@/services/runtime";
import { ClinicalEditorPage } from "./ClinicalEditorPage";

export function NarrativeEditorPage() {
  const { notify } = useToast();

  const mutation = useMutation({
    mutationFn: clinicalService.requestAnalysis,
    onSuccess: () => {
      notify({
        type: "success",
        title: "Análise solicitada com sucesso",
        description: "A síntese assistiva da IA foi enfileirada e ficará pendente até sua revisão e assinatura clínica.",
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Confira os dados digitados e a conexão com a API.";
      notify({
        type: "error",
        title: "Falha na análise assistiva",
        description: message,
      });
    },
  });

  if (isApiMode) {
    return <ClinicalEditorPage />;
  }

  return (
    <>
      <PageHeader
        title="Editor narrativo de prontuário"
        description="Ambiente de redação clínica longa com foco em legibilidade, preservação contínua de rascunhos (autosave) e scaffolds estruturados (SOAP/DAP)."
      />

      <Card className="rounded-3xl">
        <CardContent className="p-5 md:p-8">
          <NarrativeEditor
            isSubmitting={mutation.isPending}
            onRequestAnalysis={(content) => mutation.mutate(content)}
          />

          {/* Feedback cognitivo imediato em estágios (<400ms - Limite de Doherty) */}
          {mutation.isPending ? (
            <div className="mt-6 space-y-4 rounded-2xl border border-dashed border-[var(--aelo-thread)] bg-status-blue-background p-5">
              <div className="flex items-center gap-2 text-body-semibold text-[var(--aelo-thread)]">
                <RiSparklingLine className="h-4 w-4 text-[var(--aelo-thread)]" aria-hidden="true" />
                Processamento em execução pela IA consultiva
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-caption-1-regular">
                <div className="flex items-center gap-2 rounded border border-border-button-default bg-background-full p-2.5">
                  <RiBrainLine className="h-4 w-4 text-[var(--aelo-thread)] shrink-0" />
                  <span>1. Indexando narrativa clínica e vocabulário afetivo</span>
                </div>
                <div className="flex items-center gap-2 rounded border border-border-button-default bg-background-full p-2.5">
                  <RiNodeTree className="h-4 w-4 text-status-lime-text shrink-0" />
                  <span>2. Mapeando entidades, sintomas e hipóteses</span>
                </div>
                <div className="flex items-center gap-2 rounded border border-border-button-default bg-background-full p-2.5">
                  <RiCpuLine className="h-4 w-4 text-status-yellow-text shrink-0" />
                  <span>3. Estruturando proposições para supervisão humana</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <LoadingSkeleton className="h-3 w-56" />
                <LoadingSkeleton className="h-14 w-full" />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
