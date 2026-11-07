import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AeloBrand } from "./AeloBrand";

describe("AeloBrand", () => {
  it("shows name and optional description", () => {
    render(<AeloBrand subtitle="Memória clínica inteligente" />);
    expect(screen.getByText("AELO").tagName).toBe("P");
    expect(screen.getByText("Memória clínica inteligente")).toBeDefined();
  });
  it("can act as the main page heading", () => {
    render(<AeloBrand titleAs="h1" />);
    expect(screen.getByRole("heading", { level: 1, name: "AELO" })).toBeDefined();
  });
  it("keeps the illustration decorative", () => {
    const { container } = render(<AeloBrand />);
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/brand/aelo-app-icon.svg");
  });
});
