import { beforeEach, describe, expect, it } from "vitest";
import { authStorage } from "./authStorage";

describe("session credentials", () => {
  beforeEach(() => {
    authStorage.clear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("keeps the access token in memory and removes legacy browser copies", () => {
    sessionStorage.setItem("aelo.access_token", "legacy-token");
    sessionStorage.setItem("aelo.user", "legacy-user");
    localStorage.setItem("aelo.access_token", "legacy-access");
    localStorage.setItem("aelo.refresh_token", "legacy-refresh");
    authStorage.setTokens({ accessToken: "memory-token" });
    expect(authStorage.getAccessToken()).toBe("memory-token");
    expect(sessionStorage.getItem("aelo.access_token")).toBeNull();
    expect(sessionStorage.getItem("aelo.user")).toBeNull();
    expect(localStorage.getItem("aelo.access_token")).toBeNull();
    expect(localStorage.getItem("aelo.refresh_token")).toBeNull();
    authStorage.clear();
    expect(authStorage.getAccessToken()).toBeNull();
  });
});
