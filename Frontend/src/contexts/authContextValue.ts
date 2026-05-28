import { createContext } from "react";
import type { LoginPayload } from "@/services/authService";
import type { Permission, User } from "@/types/auth";

export interface AuthContextValue {
  user: User | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  can: (permission: Permission) => boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
