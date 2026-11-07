import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/themeStore";

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = nextTheme === "dark" ? "Usar tema escuro" : "Usar tema claro";
  const Icon = nextTheme === "dark" ? Moon : Sun;

  return (
    <Button size="icon" variant="ghost" aria-label={label} title={label} onClick={() => setTheme(nextTheme)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
