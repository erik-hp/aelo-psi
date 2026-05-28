import { NavLink } from "react-router-dom";
import { Brain, CalendarClock, ClipboardList, DollarSign, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import type { Permission } from "@/types/auth";

const navItems: Array<{ label: string; to: string; icon: React.ElementType; permission?: Permission }> = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, permission: "dashboard:read" },
  { label: "Pacientes", to: "/patients", icon: Users, permission: "patients:read" },
  { label: "Agenda", to: "/agenda", icon: CalendarClock, permission: "sessions:read" },
  { label: "Financeiro", to: "/finance", icon: DollarSign, permission: "finance:read" },
  { label: "Auditoria", to: "/audit", icon: ClipboardList, permission: "audit:read" },
  { label: "Usuários", to: "/users", icon: ShieldCheck, permission: "users:manage" },
  { label: "Configurações", to: "/settings", icon: Settings, permission: "settings:manage" },
];

export function Sidebar() {
  const { can } = usePermissions();
  const visibleItems = navItems.filter((item) => !item.permission || can(item.permission));

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-background/95 px-4 py-5 lg:block">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
          <Brain className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-semibold">AELO</p>
          <p className="text-xs text-muted-foreground">Clinical Intelligence</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1" aria-label="Navegação principal">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "focus-ring flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                  isActive && "bg-secondary text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
