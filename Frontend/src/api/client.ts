import axios, { AxiosError } from "axios";
import { authStorage } from "@/services/authStorage";

let refreshPromise: Promise<string> | null = null;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  timeout: 15_000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios.post<{ access: string }>(
      `${apiClient.defaults.baseURL}/auth/refresh/`,
      {},
      { withCredentials: true, headers: { "X-AELO-Session": "1" } },
    ).then(({ data }) => {
      authStorage.setTokens({ accessToken: data.access });
      return data.access;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const access = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch {
        authStorage.clear();
        window.dispatchEvent(new Event("aelo:session-expired"));
      }
    }

    return Promise.reject(error);
  },
);
