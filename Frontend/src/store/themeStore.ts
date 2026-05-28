import { create } from "zustand";

interface ThemeState {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark",
  setTheme: (theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    set({ theme });
  },
}));
