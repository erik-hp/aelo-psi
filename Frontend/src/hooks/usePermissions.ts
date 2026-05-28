import { useAuth } from "@/hooks/useAuth";
import type { Permission } from "@/types/auth";

export function usePermissions() {
  const { can, permissions, user } = useAuth();

  return {
    role: user?.role,
    permissions,
    can,
    canAny: (items: Permission[]) => items.some((permission) => can(permission)),
  };
}
