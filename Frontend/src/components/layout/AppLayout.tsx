import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
