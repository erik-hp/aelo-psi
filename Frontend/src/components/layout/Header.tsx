import { Bell, LogOut, Menu, MonitorX } from "lucide-react";
import { RiSearchLine } from "@remixicon/react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface HeaderProps {
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const roleLabels: Record<string, string> = { ADMIN: "Administração", PSYCHOLOGIST: "Psicologia", INTERN: "Estágio" };

export function Header({ onOpenSidebar, isSidebarOpen = false }: HeaderProps) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b border-separator-border bg-background-full">
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
          <ThemeToggle />
          <div className="hidden px-2 sm:block">
            <p className="text-caption-1-medium">{user?.name}</p>
            <p className="text-caption-1-regular text-text-secondary">{user ? roleLabels[user.role] ?? user.role : null}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Sair de todos os dispositivos"
            title="Sair de todos os dispositivos"
            onClick={() => { if (window.confirm("Encerrar a sessão em todos os dispositivos?")) void logout(true); }}
          >
            <MonitorX className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Sair" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
