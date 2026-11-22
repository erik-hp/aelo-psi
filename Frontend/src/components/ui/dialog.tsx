import { RiCloseLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirmar", cancelLabel = "Cancelar", onConfirm, onClose }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} title={title} size="md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-title-3-semibold">{title}</h2>
            <p className="mt-2 text-body-regular text-text-secondary">{description}</p>
          </div>
          <Button aria-label="Fechar" size="icon" variant="ghost" onClick={onClose}>
            <RiCloseLine className="size-4" />
          </Button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
    </Dialog>
  );
}
