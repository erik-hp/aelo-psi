import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function stubSystem(prefersDark: boolean | null) {
  vi.stubGlobal("matchMedia", prefersDark === null ? undefined : vi.fn(() => ({ matches: prefersDark })));
}

async function loadStore() {
  vi.resetModules();
  return import("./themeStore");
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Theme store", () => {
  it("follows the system when there is no saved choice", async () => {
    stubSystem(true);
    const { initializeTheme, useThemeStore } = await loadStore();
    initializeTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("prefers the saved choice over the system", async () => {
    stubSystem(true);
    localStorage.setItem("aelo.theme", "light");
    const { initializeTheme } = await loadStore();
    initializeTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("ignores an invalid saved value", async () => {
    stubSystem(false);
    localStorage.setItem("aelo.theme", "<script>");
    const { useThemeStore } = await loadStore();
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("falls back to light without matchMedia", async () => {
    stubSystem(null);
    const { useThemeStore } = await loadStore();
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("applies, saves and exposes the chosen theme", async () => {
    stubSystem(false);
    const { useThemeStore } = await loadStore();
    useThemeStore.getState().setTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("aelo.theme")).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#0f1d27");
  });

  it("keeps working when storage is blocked", async () => {
    stubSystem(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const { useThemeStore } = await loadStore();
    useThemeStore.getState().setTheme("dark");
    expect(useThemeStore.getState().theme).toBe("dark");
  });
});
