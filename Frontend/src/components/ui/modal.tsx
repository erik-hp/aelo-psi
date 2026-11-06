import type { ReactNode } from "react";
import { Modal, ModalBody, type ModalSize } from "@/components/base/modal/modal";

/** Common panel for the application's controlled dialogs. */
export function Dialog({ open, onClose, title, children, size = "lg", busy = false }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: ModalSize; busy?: boolean }) {
  return <Modal isOpen={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}
    isDismissable={!busy} isKeyboardDismissDisabled={busy} aria-label={title} size={size}>
    <ModalBody className="space-y-5">{children}</ModalBody>
  </Modal>;
}
