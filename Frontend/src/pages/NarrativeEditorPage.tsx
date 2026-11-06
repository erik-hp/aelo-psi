import { useMutation } from "@tanstack/react-query";
import { Brain, Cpu, Network, Sparkles } from "lucide-react";
import { NarrativeEditor } from "@/components/forms/NarrativeEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/useToast";
import { clinicalService } from "@/services/clinicalService";
import { isApiMode } from "@/services/runtime";

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
    return <PageHeader title="Editor Narrativo de Prontuário" description="Selecione uma sessão no perfil do paciente para editar e salvar o rascunho clínico no servidor protegido." />;
  }

  return (
    <>
      <PageHeader
        title="Editor Narrativo de Prontuário"
        description="Ambiente de redação clínica longa com foco em legibilidade, preservação contínua de rascunhos (autosave) e scaffolds estruturados (SOAP/DAP)."
      />

      <Card className="border-border-button-default shadow-sm">
        <CardContent className="p-5 md:p-7">
          <NarrativeEditor
            isSubmitting={mutation.isPending}
            onRequestAnalysis={(content) => mutation.mutate(content)}
          />

          {/* Feedback cognitivo imediato em estágios (<400ms - Limite de Doherty) */}
          {mutation.isPending ? (
            <div className="mt-6 space-y-4 rounded-lg border border-border-focus-ring bg-status-blue-background p-5 animate-pulse">
              <div className="flex items-center gap-2 text-body-semibold text-status-blue-text">
                <Sparkles className="h-4 w-4 animate-spin text-status-blue-text" />
                Processamento Cognitivo em Execução pela IA Consultiva
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-caption-1-regular">
                <div className="flex items-center gap-2 rounded border border-border-button-default bg-background-full p-2.5">
                  <Brain className="h-4 w-4 text-status-blue-text shrink-0" />
                  <span>1. Indexando narrativa clínica e vocabulário afetivo</span>
                </div>
                <div className="flex items-center gap-2 rounded border border-border-button-default bg-background-full p-2.5">
                  <Network className="h-4 w-4 text-status-lime-text shrink-0" />
                  <span>2. Mapeando entidades, sintomas e hipóteses</span>
                </div>
                <div className="flex items-center gap-2 rounded border border-border-button-default bg-background-full p-2.5">
                  <Cpu className="h-4 w-4 text-status-yellow-text shrink-0" />
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
