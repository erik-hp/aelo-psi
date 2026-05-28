import { apiClient } from "@/api/client";
import type { AuthTokens, User } from "@/types/auth";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

interface ApiLoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number | string;
    username: string;
    email: string;
    role: User["role"];
    clinic_id?: string | null;
  };
}

const demoUsers: Record<string, User> = {
  "admin@aelo.com": {
    id: "u-1",
    name: "Dra. Marina Costa",
    email: "admin@aelo.com",
    role: "ADMIN",
    crp: "CRP 06/112233",
  },
  "psi@aelo.com": {
    id: "u-2",
    name: "Dr. Rafael Nunes",
    email: "psi@aelo.com",
    role: "PSYCHOLOGIST",
    crp: "CRP 06/445566",
  },
  "intern@aelo.com": {
    id: "u-3",
    name: "Lia Andrade",
    email: "intern@aelo.com",
    role: "INTERN",
  },
};

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    if (import.meta.env.VITE_USE_API === "true") {
      const username = payload.email.includes("@") ? payload.email.split("@")[0] : payload.email;
      const { data } = await apiClient.post<ApiLoginResponse>("/auth/login/", {
        username,
        password: payload.password,
      });
      return {
        user: {
          id: String(data.user.id),
          name: data.user.username,
          email: data.user.email,
          role: data.user.role,
        },
        tokens: {
          accessToken: data.access,
          refreshToken: data.refresh,
        },
      };
    }

    await new Promise((resolve) => window.setTimeout(resolve, 700));
    const user = demoUsers[payload.email.toLowerCase()] ?? demoUsers["psi@aelo.com"];
    return {
      user,
      tokens: {
        accessToken: "demo-access-token",
        refreshToken: "demo-refresh-token",
      },
    };
  },
};
