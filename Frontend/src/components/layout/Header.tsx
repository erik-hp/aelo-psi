import { Bell, LogOut, Menu, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/88 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
        <Button className="lg:hidden" size="icon" variant="ghost" aria-label="Abrir navegação">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="max-w-xl pl-9" placeholder="Buscar paciente, sessão, prontuário ou evento" aria-label="Busca global" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Notificações">
            <Bell className="h-4 w-4" />
          </Button>
          <div className="hidden items-center gap-3 rounded-md border border-border bg-card px-3 py-2 sm:flex">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <div>
              <p className="text-xs font-medium">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground">{user?.role}</p>
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
