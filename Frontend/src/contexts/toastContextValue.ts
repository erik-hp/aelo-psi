import { createContext } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

export interface ToastContextValue {
  notify: (toast: Omit<Toast, "id">) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);
