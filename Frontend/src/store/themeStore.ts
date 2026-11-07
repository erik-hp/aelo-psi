import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "aelo.theme";
const BROWSER_COLORS: Record<Theme, string> = { dark: "#0f1d27", light: "#edf2f1" };

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BROWSER_COLORS[theme]);
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: savedTheme() ?? systemTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The choice still applies to this visit when storage is blocked.
    }
    set({ theme });
  },
}));

/** Applies the resolved theme before the first render. */
export function initializeTheme() {
  applyTheme(useThemeStore.getState().theme);
}
