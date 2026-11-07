import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/app/App";
import { DirectionProvider } from "@/components/foundations/direction/direction";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { queryClient } from "@/lib/queryClient";
import { initializeTheme } from "@/store/themeStore";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource-variable/source-serif-4/wght.css";
import "@/styles/globals.css";

initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DirectionProvider locale="pt-BR">
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
    </DirectionProvider>
  </React.StrictMode>,
);
