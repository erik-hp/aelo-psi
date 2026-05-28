import type { Permission, Role } from "@/types/auth";

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    "dashboard:read",
    "patients:read",
    "patients:write",
    "sessions:read",
    "sessions:write",
    "analysis:validate",
    "audit:read",
    "finance:read",
    "users:manage",
    "settings:manage",
  ],
  PSYCHOLOGIST: [
    "dashboard:read",
    "patients:read",
    "patients:write",
    "sessions:read",
    "sessions:write",
    "analysis:validate",
    "finance:read",
  ],
  INTERN: ["dashboard:read", "patients:read", "sessions:read"],
};

export function hasPermission(role: Role | undefined, permission: Permission) {
  if (!role) return false;
  return rolePermissions[role].includes(permission);
}

export function getPermissions(role: Role) {
  return rolePermissions[role];
}
