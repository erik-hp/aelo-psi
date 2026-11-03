import { lazy, Suspense } from "react";
import { GitBranch, History, Network, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePatientVault } from "@/hooks/usePatientVault";
import { clinicalService } from "@/services/clinicalService";
import type { AIAnalysis } from "@/types/clinical";
import { isApiMode } from "@/services/runtime";
import { VaultApprovalModal } from "@/components/patients/VaultApprovalModal";
import { VaultNodeInspector } from "@/components/patients/VaultNodeInspector";
import { VaultTimeline } from "@/components/patients/VaultTimeline";

const VaultCytoscapeCanvas = lazy(() =>
  import("@/components/patients/VaultCytoscapeCanvas").then((module) => ({
    default: module.VaultCytoscapeCanvas,
  })),
);

export interface PatientVaultProps {
  patientId: string;
  analyses: AIAnalysis[];
  onSelectNote?: (noteId: string) => void;
}

export function PatientVault({
  patientId,
  analyses,
  onSelectNote,
}: PatientVaultProps) {
  const {
    user,
    graph,
    tab,
    setTab,
    selectedNode,
    setSelectedNode,
    markdown,
    approvalId,
    setApprovalId,
    create,
    approve,
    preview,
  } = usePatientVault(patientId);

  const nodes = graph?.nodes ?? [];
  const latest = analyses.find(
    (item) =>
      item.status === "pending" &&
      !graph?.checkpoints.some((checkpoint) => checkpoint.analysis_id === item.id),
  );

  const pendingCheckpoint = graph?.checkpoints.find((c) => c.analysis_id === approvalId);

  return (
    <Card className="mt-6 border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Network className="h-5 w-5 text-primary" />
              Cofre Cognitivo (Vault)
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Estruturação longitudinal em grafo de conhecimento (GraphRAG) a partir de trechos literais do prontuário.
            </p>
          </div>
          {latest && (
            <Button
              type="button"
              disabled={create.isPending}
              onClick={() => create.mutate(latest.id)}
              className="gap-2 shadow-sm shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              Gerar checkpoint da análise recente
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Abas com modelos mentais canônicos (substituindo jargão de saves pela Lei de Jakob) */}
        <div
          className="flex gap-2 border-b border-border/80 pb-2"
          role="tablist"
          aria-label="Visões do Cofre Cognitivo"
        >
          <Button
            type="button"
            variant={tab === "graph" ? "default" : "outline"}
            role="tab"
            aria-selected={tab === "graph"}
            onClick={() => setTab("graph")}
            className="gap-2 text-xs font-medium"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Topologia do Grafo Cognitivo
          </Button>

          <Button
            type="button"
            variant={tab === "timeline" ? "default" : "outline"}
            role="tab"
            aria-selected={tab === "timeline"}
            onClick={() => setTab("timeline")}
            className="gap-2 text-xs font-medium"
          >
            <History className="h-3.5 w-3.5" />
            Histórico de Checkpoints Clínicos
          </Button>
        </div>

        {tab === "graph" ? (
          <section role="tabpanel" aria-label="Grafo do Vault" className="space-y-3">
            {nodes.length ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <Suspense
                  fallback={
                    <div className="flex h-[460px] w-full flex-col justify-between rounded-md border border-border bg-card/60 p-6 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-44 rounded bg-muted/80" />
                        <div className="h-7 w-20 rounded bg-muted/60" />
                      </div>
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                        <p className="text-xs text-muted-foreground">
                          Renderizando topologia conceitual do grafo...
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div className="h-3 w-20 rounded bg-muted/50" />
                        <div className="h-3 w-20 rounded bg-muted/50" />
                      </div>
                    </div>
                  }
                >
                  <VaultCytoscapeCanvas graph={graph!} onSelectNode={setSelectedNode} />
                </Suspense>

                <VaultNodeInspector graph={graph!} nodeId={selectedNode} onSelectNote={onSelectNote} />
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                <Network className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="font-medium text-foreground">O grafo ainda não possui entidades extraídas.</p>
                <p className="mt-1 text-xs">
                  Envie anotações clínicas na aba de Prontuários para gerar a análise assistiva e estruturar o cofre cognitivo.
                </p>
              </div>
            )}

            {!!graph?.communities.length && (
              <p className="text-xs text-muted-foreground">
                {graph.communities.length} comunidades detectadas via algoritmo de Leiden. Agrupamentos algorítmicos possuem caráter estritamente consultivo e não configuram diagnóstico autônomo (CFP nº 009/2024).
              </p>
            )}
          </section>
        ) : (
          <VaultTimeline
            checkpoints={graph?.checkpoints ?? []}
            markdown={markdown}
            canApprove={isApiMode && user?.role === "PSYCHOLOGIST"}
            busy={approve.isPending}
            onPreview={(id) => preview.mutate(id)}
            onApprove={setApprovalId}
            onDownload={(id) => {
              void clinicalService.downloadVaultCheckpoint(id);
            }}
          />
        )}

        <VaultApprovalModal
          open={approvalId !== null}
          busy={approve.isPending}
          onClose={() => setApprovalId(null)}
          checkpointId={pendingCheckpoint?.id}
          hashSHA256={pendingCheckpoint?.content_sha256}
          requireHash={isApiMode}
          nodeCount={pendingCheckpoint?.node_count}
          edgeCount={pendingCheckpoint?.edge_count}
          onConfirm={(justification) => {
            if (approvalId) approve.mutate({ analysisId: approvalId, justification });
          }}
        />
      </CardContent>
    </Card>
  );
}
