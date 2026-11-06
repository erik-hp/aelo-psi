import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileText, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { isApiMode } from "@/services/runtime";
import { signingService } from "@/services/signingService";
import type { AIAnalysis } from "@/types/clinical";

export function AIAnalysisCard({ analysis }: { analysis: AIAnalysis }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const review = useMutation({
    mutationFn: (decision: "VALIDATED" | "REJECTED") => {
      if (!user) throw new Error("Sessão expirada.");
      return signingService.review(analysis.id, decision, comment.trim(), user.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      notify({ type: "success", title: "Revisão assinada", description: "A decisão foi registrada com assinatura criptográfica." });
    },
    onError: (error) => notify({ type: "error", title: "Falha ao assinar revisão", description: error.message }),
  });
  const canReview = isApiMode && analysis.status === "pending" && user?.role === "PSYCHOLOGIST";
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <CardTitle>Análise assistiva</CardTitle>
            <CardDescription>Sugestão gerada por IA. Necessita validação humana.</CardDescription>
          </div>
          <Badge variant={analysis.status === "validated" ? "success" : "warning"}>{analysis.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border-button-default bg-background-secondary-default p-3">
            <Gauge className="h-4 w-4 text-status-blue-text" />
            <p className="mt-2 text-caption-1-regular text-text-secondary">Score de relevância</p>
            <p className="text-title-3-semibold">{analysis.relevanceScore}%</p>
          </div>
          <div className="rounded-md border border-border-button-default bg-background-secondary-default p-3">
            <CheckCircle2 className="h-4 w-4 text-status-lime-text" />
            <p className="mt-2 text-caption-1-regular text-text-secondary">Coerência narrativa</p>
            <p className="text-title-3-semibold">{analysis.narrativeCoherence === null ? "—" : `${analysis.narrativeCoherence}%`}</p>
          </div>
          <div className="rounded-md border border-border-button-default bg-background-secondary-default p-3">
            <FileText className="h-4 w-4 text-status-blue-text" />
            <p className="mt-2 text-caption-1-regular text-text-secondary">Fontes utilizadas</p>
            <p className="text-title-3-semibold">{analysis.sources.length}</p>
          </div>
        </div>
        <section>
          <h4 className="text-body-medium">Padrões identificados</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.patterns.map((pattern) => <Badge key={pattern} variant="default">{pattern}</Badge>)}
          </div>
        </section>
        <section>
          <h4 className="text-body-medium">Evolução longitudinal</h4>
          <p className="mt-2 text-body-regular text-text-secondary">{analysis.longitudinalEvolution}</p>
        </section>
        <section>
          <h4 className="flex items-center gap-2 text-body-medium">
            <AlertTriangle className="h-4 w-4 text-status-yellow-text" />
            Pontos de atenção
          </h4>
          <ul className="mt-2 space-y-2 text-body-regular text-text-secondary">
            {analysis.attentionPoints.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </section>
        <section>
          <h4 className="text-body-medium">Sessões relacionadas e fontes</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.sources.map((source) => <Badge key={source} variant="muted">{source}</Badge>)}
          </div>
        </section>
        {canReview && (
          <div className="space-y-3 border-t border-border-button-default pt-4">
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Comentário da revisão (opcional)" />
            <label className="flex items-center gap-2 text-body-regular">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              Revisei o conteúdo e as fontes desta análise.
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={!confirmed || review.isPending} onClick={() => review.mutate("REJECTED")}>Rejeitar sugestão</Button>
              <Button disabled={!confirmed || review.isPending} onClick={() => review.mutate("VALIDATED")}>Assinar e validar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
