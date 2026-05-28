import axios, { AxiosError } from "axios";
import { authStorage } from "@/services/authStorage";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

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
      const refreshToken = authStorage.getRefreshToken();

      if (refreshToken) {
        try {
          const response = await axios.post(
            `${apiClient.defaults.baseURL}/auth/refresh/`,
            { refresh: refreshToken },
          );
          authStorage.setTokens({
            accessToken: response.data.access,
            refreshToken: response.data.refresh ?? refreshToken,
          });
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return apiClient(originalRequest);
        } catch {
          authStorage.clear();
          window.dispatchEvent(new Event("aelo:session-expired"));
        }
      }
    }

    return Promise.reject(error);
  },
);
