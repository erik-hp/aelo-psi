import { apiClient, refreshAccessToken } from "@/api/client";
import type { AuthTokens, User } from "@/types/auth";
import { isApiMode } from "@/services/runtime";
import { authStorage } from "@/services/authStorage";

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
  async restoreSession(): Promise<User | null> {
    if (!isApiMode) return null;
    try {
      await refreshAccessToken();
      const { data } = await apiClient.get<ApiLoginResponse["user"]>("/auth/me/");
      return { id: String(data.id), name: data.username, email: data.email, role: data.role };
    } catch {
      return null;
    }
  },
  async login(payload: LoginPayload): Promise<LoginResponse> {
    if (isApiMode) {
      const { data } = await apiClient.post<ApiLoginResponse>("/auth/login/", {
        username: payload.email,
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
        },
      };
    }

    await new Promise((resolve) => window.setTimeout(resolve, 700));
    const user = demoUsers[payload.email.toLowerCase()];
    if (!user) throw new Error("Usuário de demonstração não encontrado.");
    return {
      user,
      tokens: {
        accessToken: "demo-access-token",
      },
    };
  },
  async logout(allDevices = false): Promise<void> {
    if (!isApiMode) return;
    try {
      const access = authStorage.getAccessToken();
      await apiClient.post("/auth/logout/", allDevices ? { all_devices: true } : {}, { headers: { "X-AELO-Session": "1", ...(access ? { Authorization: `Bearer ${access}` } : {}) } });
    } catch {
      // Local credentials are cleared even when the API is unavailable.
    }
  },
};
