import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  CalendarClock,
  ClipboardList,
  ClockAlert,
  DollarSign,
  FileEdit,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { clinicalService } from "@/services/clinicalService";
import type { Permission } from "@/types/auth";

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  permission?: Permission;
  badge?: "agenda";
}

const clinicalItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, permission: "dashboard:read" },
  { label: "Agenda", to: "/agenda", icon: CalendarClock, permission: "sessions:read", badge: "agenda" },
  { label: "Pacientes", to: "/patients", icon: Users, permission: "patients:read" },
  { label: "Editor Clínico", to: "/editor", icon: FileEdit },
];

const managementItems: NavItem[] = [
  { label: "Financeiro", to: "/finance", icon: DollarSign, permission: "finance:read" },
  { label: "Auditoria", to: "/audit", icon: ClipboardList, permission: "audit:read" },
  { label: "Usuários", to: "/users", icon: ShieldCheck, permission: "users:manage" },
  { label: "Configurações", to: "/settings", icon: Settings, permission: "settings:manage" },
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { can } = usePermissions();

  const { data: agenda = [] } = useQuery({
    queryKey: ["agenda"],
    queryFn: clinicalService.getAgenda,
    staleTime: 60_000,
  });

  // Efeito Zeigarnik: Identifica prontuários e sessões com pendência de evolução ou atenção
  const pendingReviews = agenda.filter(
    (item) => item.status === "needs_review" || (item.attentionIndex !== null && item.attentionIndex >= 80),
  ).length;

  const filterItems = (items: NavItem[]) => items.filter((item) => !item.permission || can(item.permission));

  const visibleClinical = filterItems(clinicalItems);
  const visibleManagement = filterItems(managementItems);

  return (
    <>
      {/* Backdrop para mobile / tablet (<1024px) */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label="Fechar navegação móvel"
          role="button"
          tabIndex={0}
          onKeyDown={(event) => event.key === "Escape" && onClose?.()}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background/95 px-4 py-5 shadow-2xl transition-transform duration-200 ease-in-out lg:z-30 lg:translate-x-0 lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">AELO</p>
              <p className="text-xs text-muted-foreground">Clinical Intelligence</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden"
            aria-label="Fechar navegação"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-6 flex flex-1 flex-col overflow-y-auto">
          {/* Seção 1: Atendimento Clínico */}
          <div>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Atendimento Clínico
            </p>
            <nav className="mt-2 space-y-1" aria-label="Atendimento Clínico">
              {visibleClinical.map((item) => {
                const Icon = item.icon;
                const hasPendingBadge = item.badge === "agenda" && pendingReviews > 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => onClose?.()}
                    className={({ isActive }) =>
                      cn(
                        "focus-ring flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                        isActive && "bg-secondary text-foreground font-medium",
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{item.label}</span>
                    </div>
                    {hasPendingBadge ? (
                      <Badge variant="warning" className="ml-auto text-[10px] px-1.5 py-0 h-4 font-semibold">
                        {pendingReviews}
                      </Badge>
                    ) : null}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Seção 2: Governança & Gestão */}
          <div className="mt-6">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Governança & Gestão
            </p>
            <nav className="mt-2 space-y-1" aria-label="Governança & Gestão">
              {visibleManagement.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => onClose?.()}
                    className={({ isActive }) =>
                      cn(
                        "focus-ring flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                        isActive && "bg-secondary text-foreground font-medium",
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Widget Zeigarnik: Consciência de Pendências Clínicas */}
          {pendingReviews > 0 ? (
            <div className="mt-auto pt-6">
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <ClockAlert className="h-3.5 w-3.5" />
                    Pendências de Evolução
                  </span>
                  <Badge variant="warning" className="px-1.5 py-0 text-[10px] font-bold">
                    {pendingReviews}
                  </Badge>
                </div>
                <p className="mt-1.5 leading-relaxed text-muted-foreground">
                  {pendingReviews === 1
                    ? "1 prontuário aguarda evolução para fechamento ético do dia."
                    : `${pendingReviews} prontuários aguardam evolução para fechamento ético do dia.`}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
