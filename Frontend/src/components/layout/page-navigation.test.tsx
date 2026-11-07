import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ToastProvider } from "@/contexts/ToastContext";
import { useToast } from "@/hooks/useToast";

vi.mock("@/components/layout/Header", () => ({ Header: () => null }));
vi.mock("@/components/layout/Sidebar", () => ({ Sidebar: () => null }));

function First() {
  return <><PageHeader title="Pacientes" description="Diretório sintético" /><Link to="/agenda">Ir para agenda</Link></>;
}

function Second() {
  return <PageHeader title="Agenda" description="Sessões sintéticas" />;
}

function showApp() {
  return render(
    <MemoryRouter initialEntries={["/patients"]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/patients" element={<First />} />
          <Route path="/agenda" element={<Second />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Page navigation for assistive technology", () => {
  it("names each page in the document title", async () => {
    const user = userEvent.setup();
    showApp();
    expect(document.title).toBe("Pacientes | AELO");
    await user.click(screen.getByRole("link", { name: "Ir para agenda" }));
    expect(document.title).toBe("Agenda | AELO");
  });

  it("moves focus to the page content after navigating", async () => {
    const user = userEvent.setup();
    showApp();
    await user.click(screen.getByRole("link", { name: "Ir para agenda" }));
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });

  it("does not steal focus when the application opens", () => {
    showApp();
    expect(document.activeElement).not.toBe(screen.getByRole("main"));
  });
});

function Notifier({ type }: { type: "error" | "success" }) {
  const { notify } = useToast();
  return <button onClick={() => notify({ type, title: "Mensagem sintética" })}>Notificar</button>;
}

function showToast(type: "error" | "success") {
  vi.useFakeTimers();
  render(<ToastProvider><Notifier type={type} /></ToastProvider>);
  act(() => screen.getByRole("button", { name: "Notificar" }).click());
}

describe("Toast duration", () => {
  it("keeps an error readable longer than a confirmation", () => {
    showToast("error");
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(screen.queryByText("Mensagem sintética")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(screen.queryByText("Mensagem sintética")).toBeNull();
  });

  it("keeps success messages brief", () => {
    showToast("success");
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(screen.queryByText("Mensagem sintética")).toBeNull();
  });
});
