import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useThemeStore } from "@/store/themeStore";

beforeEach(() => {
  localStorage.clear();
  useThemeStore.setState({ theme: "light" });
  document.documentElement.className = "";
});

afterEach(cleanup);

describe("ThemeToggle", () => {
  it("names the theme it will apply and switches both ways", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: "Usar tema escuro" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Usar tema claro" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("aelo.theme")).toBe("light");
  });
});
