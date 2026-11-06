import { lazy, Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

function renderSilencingReact(ui: React.ReactElement) {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(ui);
  return consoleError;
}

describe("RouteErrorBoundary", () => {
  it("renders the page when nothing fails", () => {
    render(<RouteErrorBoundary><p>Conteúdo sintético</p></RouteErrorBoundary>);
    expect(screen.getByText("Conteúdo sintético")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("announces a failed render without exposing the error text", () => {
    function Broken(): never {
      throw new Error("texto clínico sintético");
    }
    const consoleError = renderSilencingReact(<RouteErrorBoundary><Broken /></RouteErrorBoundary>);
    expect(screen.getByRole("alert").textContent).toContain("Não foi possível abrir esta página");
    expect(screen.queryByText(/texto clínico sintético/)).toBeNull();
    expect(screen.getByRole("button", { name: "Recarregar página" })).toBeDefined();
    consoleError.mockRestore();
  });

  it("contains a code-split page whose chunk cannot be loaded", async () => {
    const Missing = lazy(() => Promise.reject(new Error("chunk indisponível")));
    const consoleError = renderSilencingReact(
      <RouteErrorBoundary><Suspense fallback={<p>Carregando</p>}><Missing /></Suspense></RouteErrorBoundary>,
    );
    expect(await screen.findByRole("alert")).toBeDefined();
    consoleError.mockRestore();
  });
});
