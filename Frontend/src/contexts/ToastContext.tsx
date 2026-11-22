import { useCallback, useMemo, useState } from "react";
import { RiCheckboxCircleLine, RiCloseCircleLine } from "@remixicon/react";
import { ToastContext, type Toast } from "@/contexts/toastContextValue";
import { cn } from "@/lib/utils";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, toast.type === "error" ? 10_000 : 4_200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 end-4 z-[120] flex w-[min(92vw,380px)] flex-col gap-3" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="clinical-panel flex gap-3 p-4">
            {toast.type === "error" ? (
              <RiCloseCircleLine className="mt-0.5 h-5 w-5 text-text-error-primary" />
            ) : (
              <RiCheckboxCircleLine className={cn("mt-0.5 h-5 w-5", toast.type === "success" ? "text-status-lime-text" : "text-status-blue-text")} />
            )}
            <div>
              <p className="text-body-medium">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-body-regular text-text-secondary">{toast.description}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
