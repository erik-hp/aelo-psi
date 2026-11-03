import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AeloBrand } from "./AeloBrand";

describe("AeloBrand", () => {
  it("shows name and optional description", () => {
    render(<AeloBrand subtitle="Memória clínica inteligente" />);
    expect(screen.getByText("AELO")).toBeDefined();
    expect(screen.getByText("Memória clínica inteligente")).toBeDefined();
  });
  it("keeps the illustration decorative", () => {
    const { container } = render(<AeloBrand />);
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/brand/aelo-symbol.svg");
  });
});
