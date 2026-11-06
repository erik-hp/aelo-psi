import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageLoading } from "@/components/ui/loading-skeleton";
import { isApiMode } from "@/services/runtime";

export function AppLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background-full text-text-primary">
      <a href="#page-content" className="focus-ring sr-only fixed start-4 top-4 z-[120] rounded-xl bg-background-primary-default px-4 py-3 text-body-medium focus:not-sr-only">Ir para o conteúdo</a>
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="min-w-0 lg:ps-72">
        <Header isSidebarOpen={isMobileSidebarOpen} onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
        <main id="page-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1600px] px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          {!isApiMode && <p role="status" className="mb-6 rounded-xl border border-status-yellow-text bg-status-yellow-background p-3 text-body-medium text-status-yellow-text">Modo demonstração · dados sintéticos. Alterações de demonstração não são registros clínicos persistidos.</p>}
          <RouteErrorBoundary key={pathname}>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}
