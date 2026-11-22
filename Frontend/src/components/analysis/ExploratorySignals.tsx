import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AIAnalysis } from "@/types/clinical";

const humanize = (label: string) => {
  const text = label.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Sinais linguísticos exploratórios (F4-01): sem escore clínico, sem série inventada, com data e fonte de cada análise. */
export function ExploratorySignals({ analyses }: { analyses: AIAnalysis[] }) {
  const withSignals = analyses.filter((analysis) => analysis.signals?.length);
  return (
    <div className="space-y-4">
      <p role="note" className="text-caption-1-regular text-text-secondary">
        Sinais linguísticos exploratórios extraídos do texto das notas pelo modelo. Não representam humor, diagnóstico, gravidade ou risco clínico,
        e a interpretação pertence ao profissional. Cada análise é independente: os rótulos mudam entre análises e ausência de sinal não é valor zero.
      </p>
      {withSignals.map((analysis) => (
        <Card key={analysis.id} className="border-border-button-default">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="aelo-display text-lg">
              Análise de {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString("pt-BR") : "data não informada"}
            </CardTitle>
            <Badge variant="muted">{analysis.status === "validated" ? "Validada" : analysis.status === "rejected" ? "Rejeitada" : "Pendente de revisão"}</Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.signals?.map((signal) => (
                <li key={signal.label}>
                  <div className="flex items-baseline justify-between gap-3 text-body-medium">
                    <span>{humanize(signal.label)}</span>
                    <span className="tabular-nums text-text-secondary">{signal.value.toFixed(2)}</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={humanize(signal.label)}
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={signal.value}
                    className="mt-1 h-2 overflow-hidden rounded-full bg-background-primary-hover"
                  >
                    <div className="h-full rounded-full bg-status-blue-background" style={{ width: `${Math.min(Math.max(signal.value, 0), 1) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
