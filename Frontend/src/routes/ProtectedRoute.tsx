import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Permission } from "@/types/auth";

export function ProtectedRoute({ permission }: { permission?: Permission }) {
  const { isAuthenticated, can } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
