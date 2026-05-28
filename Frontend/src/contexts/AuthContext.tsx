import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext, type AuthContextValue } from "@/contexts/authContextValue";
import { authService, type LoginPayload } from "@/services/authService";
import { authStorage } from "@/services/authStorage";
import type { User } from "@/types/auth";
import { getPermissions, hasPermission } from "@/utils/permissions";

const USER_KEY = "aelo.user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(() => {
    authStorage.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener("aelo:session-expired", onExpired);
    return () => window.removeEventListener("aelo:session-expired", onExpired);
  }, [logout]);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const response = await authService.login(payload);
      authStorage.setTokens(response.tokens);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const permissions = useMemo(() => (user ? getPermissions(user.role) : []), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      isAuthenticated: Boolean(user && authStorage.getAccessToken()),
      isLoading,
      login,
      logout,
      can: (permission) => hasPermission(user?.role, permission),
    }),
    [isLoading, login, logout, permissions, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
