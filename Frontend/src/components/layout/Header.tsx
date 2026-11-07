import { Bell, LogOut, Menu, ShieldCheck } from "lucide-react";
import { RiSearchLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface HeaderProps {
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onOpenSidebar, isSidebarOpen = false }: HeaderProps) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b border-border-button-default bg-background-full backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
        <Button
          className="lg:hidden"
          size="icon"
          variant="ghost"
          aria-label="Abrir navegação"
          aria-controls="application-navigation"
          aria-expanded={isSidebarOpen}
          onClick={onOpenSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <form role="search" className="relative hidden flex-1 md:block" onSubmit={(event) => { event.preventDefault(); navigate(`/patients?search=${encodeURIComponent(search.trim())}`); }}>
          <Input leadingIcon={RiSearchLine} className="max-w-xl" placeholder="Buscar pacientes por nome e pressionar Enter" aria-label="Buscar pacientes" autoComplete="off" spellCheck={false} value={search} onChange={(event) => setSearch(event.target.value)} />
        </form>
        <div className="ml-auto flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Notificações indisponíveis" title="Notificações ainda não implementadas" disabled>
            <Bell className="h-4 w-4" />
          </Button>
          <div className="hidden items-center gap-3 rounded-md border border-border-button-default bg-background-primary-default px-3 py-2 sm:flex">
            <ShieldCheck className="h-4 w-4 text-status-lime-text" />
            <div>
              <p className="text-caption-1-medium">{user?.name}</p>
              <p className="text-caption-1-regular text-text-secondary">{user?.role}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" aria-label="Sair" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
