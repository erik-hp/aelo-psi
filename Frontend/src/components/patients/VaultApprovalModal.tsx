import { useEffect, useRef, useState } from "react";
import { RiCheckboxCircleLine, RiFileCheckLine, RiShieldCheckLine } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/modal";

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
    <Dialog open={open} onClose={onClose} busy={busy} title="Justificativa da revisão clínica">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-title-3-semibold text-text-primary">
              Aprovação clínica do checkpoint
            </h2>
            <p className="mt-1 text-caption-1-regular text-text-secondary">
              Revise o conteúdo e suas fontes. A assinatura registra a decisão e permite verificar a integridade do conteúdo revisado.
            </p>
          </div>
          <Badge variant="success" className="shrink-0 gap-1 py-1">
            <RiShieldCheckLine className="h-3.5 w-3.5 text-status-lime-text" />
            Auditável
          </Badge>
        </div>

        {/* Selo Criptográfico SHA-256 e Contadores */}
        <div className="rounded-md border border-border-button-default bg-background-secondary-default p-3 text-caption-1-regular space-y-1.5">
          <div className="flex items-center justify-between font-mono text-caption-1-regular text-text-secondary">
            <span className="flex items-center gap-1.5 text-body-medium text-text-primary">
              <RiFileCheckLine className="h-3.5 w-3.5 text-status-blue-text" />
              Selo Criptográfico de Integridade
            </span>
            <span>SHA-256</span>
          </div>
          <p className="font-mono text-caption-1-regular text-text-secondary break-all bg-background-full p-1.5 rounded border border-border-button-default">
            {displayHash}
          </p>
          {(nodeCount !== undefined || edgeCount !== undefined) && (
            <div className="flex gap-4 pt-1 text-text-secondary">
              {nodeCount !== undefined && <span>{nodeCount} nós conceituais</span>}
              {edgeCount !== undefined && <span>{edgeCount} relações estruturadas</span>}
            </div>
          )}
        </div>

        {/* Scaffolds de Justificativa Rápida */}
        <div className="space-y-2">
          <label className="text-caption-1-medium text-text-secondary">
            Modelos de justificativa ética rápida (clique para preencher):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_JUSTIFICATIONS.map((quickText) => (
              <button
                key={quickText}
                type="button"
                onClick={() => setJustification(quickText)}
                className="rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-left text-caption-1-regular text-text-secondary transition-colors hover:border-border-focus-ring hover:bg-background-secondary-default hover:text-text-primary"
              >
                + {quickText.length > 45 ? `${quickText.slice(0, 42)}…` : quickText}
              </button>
            ))}
          </div>
        </div>

        {/* Área de Texto */}
        <div className="space-y-1.5">
          <label htmlFor="clinical-justification" className="text-body-medium">
            Justificativa clínica do psicólogo
          </label>
          <Textarea
            id="clinical-justification"
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Descreva a fundamentação técnica para homologação deste checkpoint da memória clínica…"
            aria-label="Justificativa clínica"
            record
          />
          <div className="flex items-center justify-between text-caption-1-regular text-text-secondary">
            <span>Mínimo de 10 caracteres para validação ética.</span>
            <span className={justification.trim().length >= 10 ? "text-status-lime-text text-body-medium" : ""}>
              {justification.trim().length}/2000 caracteres
            </span>
          </div>
        </div>

        {/* Separação Física Ergonômica dos Botões (Fitts e Prevenção de Toque Acidental) */}
        <div className="flex items-center justify-between gap-4 border-t border-border-button-default pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            disabled={busy || !isValid || (requireHash && !verifiedHashShape)}
            onClick={() => onConfirm(justification.trim())}
            className="gap-2 px-5 text-body-semibold"
          >
            <RiCheckboxCircleLine className="h-4 w-4" />
            Assinar aprovação
          </Button>
        </div>
    </Dialog>
  );
}
