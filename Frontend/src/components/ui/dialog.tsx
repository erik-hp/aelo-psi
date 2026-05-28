import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, description, onConfirm, onClose }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="clinical-panel w-full max-w-md p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          <Button aria-label="Fechar" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onConfirm}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
}
