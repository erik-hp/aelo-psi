import { lazy, Suspense } from "react";
import { GitBranch, History, Network, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePatientVault } from "@/hooks/usePatientVault";
import { clinicalService } from "@/services/clinicalService";
import type { AIAnalysis } from "@/types/clinical";
import { isApiMode } from "@/services/runtime";
import { Tabs, TabList, Tab, TabPanel } from "@/components/base/tabs/tabs";
import { PageError, PageLoading } from "@/components/ui/page-state";
import { useToast } from "@/hooks/useToast";
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
  const { notify } = useToast();
  const {
    user,
    graph,
    isLoading,
    isError,
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
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-title-3-regular">
              <Network className="h-5 w-5 text-status-blue-text" />
              Memória clínica
            </CardTitle>
            <p className="mt-1 text-caption-1-regular text-text-secondary">
              Conceitos e relações extraídos de trechos literais das notas, organizados ao longo das sessões.
            </p>
          </div>
          {latest && (
            <Button
              type="button"
              disabled={create.isPending}
              onClick={() => create.mutate(latest.id)}
              className="gap-2 shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              Gerar checkpoint da análise recente
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Abas com modelos mentais canônicos (substituindo jargão de saves pela Lei de Jakob) */}
        <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as "graph" | "timeline")}>
        <TabList
          showIndicator={false}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          aria-label="Visões da memória clínica"
        >
          <Tab id="graph" className="justify-center rounded-xl data-[selected]:bg-background-primary-default">
            <GitBranch className="h-3.5 w-3.5" />
            Mapa de conceitos
          </Tab>

          <Tab id="timeline" className="justify-center rounded-xl data-[selected]:bg-background-primary-default">
            <History className="h-3.5 w-3.5" />
            Checkpoints revisados
          </Tab>
        </TabList>

          <TabPanel id="graph" aria-label="Mapa de conceitos" className="min-w-0 space-y-3">
            {isLoading ? <PageLoading label="Carregando memória clínica…" /> : isError ? <PageError description="Não foi possível carregar a memória clínica. Nenhum dado de demonstração foi usado." /> : nodes.length ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <Suspense
                  fallback={
                    <div className="flex h-[460px] w-full flex-col justify-between rounded-md border border-border-button-default bg-background-primary-default p-6 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-44 rounded bg-background-tertiary-default" />
                        <div className="h-7 w-20 rounded bg-background-tertiary-default" />
                      </div>
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-10 w-10 rounded-full border-2 border-border-focus-ring border-t-border-focus-ring animate-spin" />
                        <p className="text-caption-1-regular text-text-secondary">
                          Montando o mapa de conceitos…
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div className="h-3 w-20 rounded bg-background-tertiary-default" />
                        <div className="h-3 w-20 rounded bg-background-tertiary-default" />
                      </div>
                    </div>
                  }
                >
                  <VaultCytoscapeCanvas graph={graph!} onSelectNode={setSelectedNode} />
                </Suspense>

                <VaultNodeInspector graph={graph!} nodeId={selectedNode} onSelectNote={onSelectNote} />
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-border-button-default p-8 text-center text-body-regular text-text-secondary">
                <Network className="mb-2 h-8 w-8 text-text-secondary" />
                <p className="text-body-medium text-text-primary">Ainda não há conceitos extraídos.</p>
                <p className="mt-1 text-caption-1-regular">
                  Envie anotações clínicas na aba de Prontuários para gerar a análise assistiva e montar o mapa de conceitos.
                </p>
              </div>
            )}

            {!!graph?.communities.length && (
              <p className="text-caption-1-regular text-text-secondary">
                {graph.communities.length} grupos de conceitos. Os agrupamentos apoiam a leitura e não configuram diagnóstico (CFP nº 009/2024).
              </p>
            )}
          </TabPanel>
          <TabPanel id="timeline" className="min-w-0">
          <VaultTimeline
            checkpoints={graph?.checkpoints ?? []}
            markdown={markdown}
            canApprove={isApiMode && user?.role === "PSYCHOLOGIST"}
            busy={approve.isPending}
            onPreview={(id) => preview.mutate(id)}
            onApprove={setApprovalId}
            onDownload={(id) => {
              void clinicalService.downloadVaultCheckpoint(id).catch(() => notify({ type: "error", title: "Falha na exportação", description: "O servidor não confirmou a disponibilidade do arquivo." }));
            }}
          />
          </TabPanel>
        </Tabs>

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
