import { useMutation } from "@tanstack/react-query";
import { NarrativeEditor } from "@/components/forms/NarrativeEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/useToast";
import { clinicalService } from "@/services/clinicalService";

export function NarrativeEditorPage() {
  const { notify } = useToast();
  const mutation = useMutation({
    mutationFn: clinicalService.requestAnalysis,
    onSuccess: () => notify({ type: "success", title: "Análise solicitada", description: "A sugestão ficará pendente até validação humana." }),
  });

  return (
    <>
      <PageHeader
        title="Editor narrativo"
        description="Ambiente de escrita longa com foco em legibilidade, baixa distração e preservação de rascunho."
      />
      <Card>
        <CardContent className="p-5 md:p-7">
          <NarrativeEditor onRequestAnalysis={(content) => mutation.mutate(content)} />
          {mutation.isPending ? (
            <div className="mt-6 space-y-3 border-t border-border pt-5">
              <LoadingSkeleton className="h-4 w-52" />
              <LoadingSkeleton className="h-20 w-full" />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
