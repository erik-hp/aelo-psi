export type Role = "ADMIN" | "PSYCHOLOGIST" | "INTERN";

export type Permission =
  | "dashboard:read"
  | "patients:read"
  | "patients:write"
  | "sessions:read"
  | "sessions:write"
  | "notes:write"
  | "analysis:validate"
  | "audit:read"
  | "finance:read"
  | "users:manage"
  | "settings:manage";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  crp?: string;
}

export interface AuthTokens {
  accessToken: string;
}
