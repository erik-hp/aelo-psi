import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
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
import { AeloBrand } from "@/components/brand/AeloBrand";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { clinicalService } from "@/services/clinicalService";
import type { Permission } from "@/types/auth";
import { ScrollFade, useScrollFade } from "@/components/foundations/scroll-fade/scroll-fade";

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
  { label: "Editor Clínico", to: "/editor", icon: FileEdit, permission: "notes:write" },
];

const managementItems: NavItem[] = [
  { label: "Financeiro", to: "/finance", icon: DollarSign, permission: "finance:read" },
  { label: "Auditoria", to: "/audit", icon: ClipboardList, permission: "audit:read" },
  { label: "Usuários", to: "/users", icon: ShieldCheck, permission: "users:manage" },
  { label: "Configurações", to: "/settings", icon: Settings, permission: "settings:manage" },
];

function NavSection({ label, items, pendingReviews, onNavigate, className }: {
  label: string;
  items: NavItem[];
  pendingReviews: number;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="px-3 text-caption-1-medium text-text-secondary">{label}</p>
      <nav className="mt-2 space-y-0.5" aria-label={label}>
        {items.map((item) => {
          const Icon = item.icon;
          const hasPendingBadge = item.badge === "agenda" && pendingReviews > 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onNavigate?.()}
              className={({ isActive }) =>
                cn(
                  "aelo-nav-link focus-ring relative flex items-center gap-3 rounded-md py-2.5 ps-4 pe-3 text-body-regular text-text-secondary transition-colors hover:bg-background-secondary-default hover:text-text-primary",
                  isActive && "text-text-primary text-body-medium",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{item.label}</span>
              {hasPendingBadge ? (
                <Badge variant="warning" showIcon={false} className="h-4 px-1.5 py-0 text-caption-2-semibold">
                  {pendingReviews}
                </Badge>
              ) : null}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const fade = useScrollFade();
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
        <button
          type="button"
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          onClick={onClose}
          aria-label="Fechar navegação móvel"
          onKeyDown={(event) => event.key === "Escape" && onClose?.()}
        />
      ) : null}

      <aside
        id="application-navigation"
        data-state={isOpen ? "open" : "closed"}
        onKeyDown={(event) => { if (event.key === "Escape") onClose?.(); }}
        className={cn(
          "fixed inset-y-0 start-0 z-50 w-72 max-w-[85vw] flex-col border-e border-border-button-default bg-background-full px-4 py-5 shadow-2xl lg:z-30 lg:shadow-none",
          isOpen ? "flex" : "hidden lg:flex",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <AeloBrand subtitle="Memória clínica assistiva" />
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

        <div className="relative mt-6 min-h-0 flex-1">
        <div onScroll={fade.onScroll} className="flex h-full flex-col gap-1 overflow-y-auto overscroll-contain pb-2">
          <NavSection label="Atendimento clínico" items={visibleClinical} pendingReviews={pendingReviews} onNavigate={onClose} />
          <NavSection className="mt-6" label="Governança e gestão" items={visibleManagement} pendingReviews={0} onNavigate={onClose} />

          {/* Widget Zeigarnik: Consciência de Pendências Clínicas */}
          {pendingReviews > 0 ? (
            <div className="mt-auto pt-6">
              <div className="rounded-lg border border-border-button-default bg-background-primary-default p-3">
                <div className="flex items-center justify-between gap-2 text-body-medium text-text-primary">
                  <span className="flex items-center gap-2">
                    <ClockAlert className="h-4 w-4 shrink-0 text-status-yellow-text" aria-hidden />
                    Pendências de evolução
                  </span>
                  <Badge variant="warning" showIcon={false} className="px-1.5 py-0 text-caption-2-bold">
                    {pendingReviews}
                  </Badge>
                </div>
                <p className="mt-1.5 text-caption-1-regular text-text-secondary">
                  {pendingReviews === 1
                    ? "1 prontuário aguarda evolução para fechamento ético do dia."
                    : `${pendingReviews} prontuários aguardam evolução para fechamento ético do dia.`}
                </p>
              </div>
            </div>
          ) : null}
        </div>
        <ScrollFade progress={fade.progress} surfaceClassName="from-background-full" />
        </div>
      </aside>
    </>
  );
}
