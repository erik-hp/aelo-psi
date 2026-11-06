import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext, type AuthContextValue } from "@/contexts/authContextValue";
import { authService, type LoginPayload } from "@/services/authService";
import { authStorage, clearLegacySessionStorage } from "@/services/authStorage";
import { isApiMode } from "@/services/runtime";
import type { User } from "@/types/auth";
import { getPermissions, hasPermission } from "@/utils/permissions";
import { useQueryClient } from "@tanstack/react-query";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isApiMode);
  const channel = useRef<BroadcastChannel | null>(null);

  const clearLocalSession = useCallback(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
    authStorage.clear();
    setUser(null);
  }, [queryClient]);

  const logout = useCallback(async () => {
    const pending = authService.logout();
    clearLocalSession();
    channel.current?.postMessage("logout");
    await pending;
  }, [clearLocalSession]);

  useEffect(() => {
    clearLegacySessionStorage();
    let active = true;
    void authService.restoreSession().then((restored) => {
      if (active) {
        setUser(restored);
        setIsLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const authChannel = new BroadcastChannel("aelo-auth");
    channel.current = authChannel;
    authChannel.onmessage = (event) => {
      if (event.data === "logout") clearLocalSession();
    };
    return () => { authChannel.close(); channel.current = null; };
  }, [clearLocalSession]);

  useEffect(() => {
    const onExpired = () => clearLocalSession();
    window.addEventListener("aelo:session-expired", onExpired);
    return () => window.removeEventListener("aelo:session-expired", onExpired);
  }, [clearLocalSession]);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const response = await authService.login(payload);
      void queryClient.cancelQueries();
      queryClient.clear();
      authStorage.setTokens(response.tokens);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

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
