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
      <Card className="border-border-button-default">
        <CardContent className="space-y-3 pt-4 text-body-regular">
          <h3 className="aelo-display text-lg">O que esta tela mostra</h3>
          <p>
            Cada bloco abaixo corresponde a uma análise assistiva deste paciente. Nele, o modelo de IA aponta temas e tons que aparecem no
            texto das notas e estima o quanto cada um está presente, numa escala de 0 a 1.
          </p>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-body-medium">Como ler</dt>
              <dd className="text-text-secondary">
                0 significa que o tema quase não aparece nas notas e 1 que aparece com muita força. É uma estimativa sobre o texto, não uma medição.
              </dd>
            </div>
            <div>
              <dt className="text-body-medium">O que não é</dt>
              <dd className="text-text-secondary">
                Não é humor real, diagnóstico, gravidade nem risco clínico. A interpretação pertence ao profissional.
              </dd>
            </div>
            <div>
              <dt className="text-body-medium">Limites</dt>
              <dd className="text-text-secondary">
                Os temas mudam de uma análise para outra, então os blocos não formam uma curva no tempo. Tema ausente não significa valor zero.
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      {withSignals.map((analysis) => (
        <Card key={analysis.id} className="border-border-button-default">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="aelo-display text-left text-lg">
              Análise de {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString("pt-BR") : "data não informada"}
            </CardTitle>
            <Badge variant="muted">{analysis.status === "validated" ? "Validada" : analysis.status === "rejected" ? "Rejeitada" : "Pendente de revisão"}</Badge>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-caption-1-regular text-text-secondary">
              Baseada em {analysis.sources.length} {analysis.sources.length === 1 ? "trecho" : "trechos"} de notas citados pelo modelo.
            </p>
            <ul className="space-y-4">
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
                    <div className="h-full rounded-full bg-accent-600" style={{ width: `${Math.min(Math.max(signal.value, 0), 1) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <div aria-hidden="true" className="mt-3 flex justify-between border-t border-border-button-default pt-2 text-caption-1-regular text-text-secondary">
              <span>0 · quase ausente</span>
              <span>1 · muito presente</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
