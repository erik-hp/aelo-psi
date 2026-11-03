import { Button } from "@/components/ui/button";
import { VaultMarkdownViewer } from "./VaultMarkdownViewer";
import type { VaultCheckpointSummary } from "@/types/vault";

export function VaultTimeline({ checkpoints, markdown, canApprove, busy, onPreview, onApprove, onDownload }: { checkpoints: VaultCheckpointSummary[]; markdown: string; canApprove: boolean; busy: boolean; onPreview: (id: string) => void; onApprove: (id: string) => void; onDownload: (id: string) => void }) {
  return <section role="tabpanel" aria-label="Checkpoints do Vault" className="space-y-3">
    <h3 className="font-medium">Checkpoints Markdown</h3>
    {checkpoints.map((checkpoint) => <div key={checkpoint.id} className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm">
      <span>{new Date(checkpoint.created_at).toLocaleString("pt-BR")} · {checkpoint.node_count} nós · {checkpoint.edge_count} relações · {checkpoint.review_status}{checkpoint.reviewed_at ? ` · revisado em ${new Date(checkpoint.reviewed_at).toLocaleString("pt-BR")}` : ""}</span>
      <Button type="button" variant="outline" onClick={() => onPreview(checkpoint.id)}>Ler .md</Button>
      {canApprove && checkpoint.review_status === "PENDING_REVIEW" && <Button type="button" disabled={busy} onClick={() => onApprove(checkpoint.analysis_id)}>Aprovar eticamente</Button>}
      {checkpoint.review_status === "VALIDATED" && <Button type="button" variant="outline" onClick={() => onDownload(checkpoint.id)}>Baixar .md</Button>}
    </div>)}
    <VaultMarkdownViewer markdown={markdown} />
  </section>;
}
