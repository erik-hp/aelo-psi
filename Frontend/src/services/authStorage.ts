import type { AuthTokens } from "@/types/auth";

const ACCESS_TOKEN_KEY = "aelo.access_token";
const REFRESH_TOKEN_KEY = "aelo.refresh_token";
const USER_KEY = "aelo.user";
let accessToken: string | null = null;

export function clearLegacySessionStorage() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const authStorage = {
  getAccessToken: () => accessToken,
  setTokens: (tokens: AuthTokens) => {
    accessToken = tokens.accessToken;
    clearLegacySessionStorage();
  },
  clear: () => {
    accessToken = null;
    clearLegacySessionStorage();
  },
};
