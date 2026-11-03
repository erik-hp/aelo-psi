import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface VaultApprovalModalProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (justification: string) => void;
  checkpointId?: string;
  hashSHA256?: string;
  requireHash?: boolean;
  nodeCount?: number;
  edgeCount?: number;
}

const QUICK_JUSTIFICATIONS = [
  "Checkpoint revisado e compatível com a evolução da sessão.",
  "Hipóteses de IA conferidas contra a nota original do prontuário.",
  "Síntese longitudinal validada com foco em metas terapêuticas.",
];

export function VaultApprovalModal({
  open,
  busy,
  onClose,
  onConfirm,
  checkpointId,
  hashSHA256,
  requireHash = false,
  nodeCount,
  edgeCount,
}: VaultApprovalModalProps) {
  const [justification, setJustification] = useState("");
  const prevCheckpointIdRef = useRef(checkpointId);

  useEffect(() => {
    if (!open || prevCheckpointIdRef.current !== checkpointId) {
      setJustification("");
      prevCheckpointIdRef.current = checkpointId;
    }
  }, [open, checkpointId]);

  if (!open) return null;

  const displayHash = hashSHA256
    ? (hashSHA256.startsWith("sha256:") ? hashSHA256 : `sha256:${hashSHA256}`)
    : "Hash SHA-256 indisponível";
  const verifiedHashShape = /^[a-f0-9]{64}$/i.test((hashSHA256 ?? "").replace(/^sha256:/, ""));
  const isValid = justification.trim().length >= 10;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Justificativa da revisão clínica"
    >
      <div className="clinical-panel w-full max-w-xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Aprovação clínica do checkpoint
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Supervisão humana ativa (HITL - CFP nº 009/2024 e LGPD Art. 20). A assinatura vincula sua decisão de forma auditável e irrevogável.
            </p>
          </div>
          <Badge variant="success" className="shrink-0 gap-1 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Auditável
          </Badge>
        </div>

        {/* Selo Criptográfico SHA-256 e Contadores */}
        <div className="rounded-md border border-border/80 bg-secondary/30 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <FileCheck className="h-3.5 w-3.5 text-primary" />
              Selo Criptográfico de Integridade
            </span>
            <span>SHA-256</span>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground break-all bg-background/50 p-1.5 rounded border border-border/40">
            {displayHash}
          </p>
          {(nodeCount !== undefined || edgeCount !== undefined) && (
            <div className="flex gap-4 pt-1 text-muted-foreground">
              {nodeCount !== undefined && <span>{nodeCount} nós conceituais</span>}
              {edgeCount !== undefined && <span>{edgeCount} relações estruturadas</span>}
            </div>
          )}
        </div>

        {/* Scaffolds de Justificativa Rápida */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Modelos de justificativa ética rápida (clique para preencher):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_JUSTIFICATIONS.map((quickText) => (
              <button
                key={quickText}
                type="button"
                onClick={() => setJustification(quickText)}
                className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary hover:text-foreground"
              >
                + {quickText.length > 45 ? `${quickText.slice(0, 42)}...` : quickText}
              </button>
            ))}
          </div>
        </div>

        {/* Área de Texto */}
        <div className="space-y-1.5">
          <label htmlFor="clinical-justification" className="text-sm font-medium">
            Justificativa clínica do psicólogo
          </label>
          <Textarea
            id="clinical-justification"
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Descreva a fundamentação técnica para homologação deste checkpoint do cofre cognitivo..."
            aria-label="Justificativa clínica"
            className="text-sm"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Mínimo de 10 caracteres para validação ética.</span>
            <span className={justification.trim().length >= 10 ? "text-accent font-medium" : ""}>
              {justification.trim().length}/2000 caracteres
            </span>
          </div>
        </div>

        {/* Separação Física Ergonômica dos Botões (Fitts e Prevenção de Toque Acidental) */}
        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            disabled={busy || !isValid || (requireHash && !verifiedHashShape)}
            onClick={() => onConfirm(justification.trim())}
            className="gap-2 px-5 font-semibold shadow-md"
          >
            <CheckCircle2 className="h-4 w-4" />
            Assinar aprovação
          </Button>
        </div>
      </div>
    </div>
  );
}
