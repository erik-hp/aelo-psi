import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockedAuth = vi.hoisted(() => ({ restoreSession: vi.fn(), login: vi.fn(), logout: vi.fn() }));
vi.mock("@/services/runtime", () => ({ isApiMode: true }));
vi.mock("@/services/authService", () => ({ authService: mockedAuth }));

import { AuthProvider } from "./AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { authStorage } from "@/services/authStorage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";

function SessionControls() {
  const { login, logout } = useAuth();
  return <><button onClick={() => void login({ email: "synthetic@example.test", password: "synthetic-test-password" })}>Entrar teste</button><button onClick={() => void logout()}>Sair teste</button></>;
}

describe("session restoration", () => {
  it("waits for refresh before rendering a protected route", async () => {
    authStorage.clear();
    let resolve!: (value: { id: string; name: string; email: string; role: "PSYCHOLOGIST" }) => void;
    mockedAuth.restoreSession.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(
      <QueryClientProvider client={new QueryClient()}><AuthProvider>
        <MemoryRouter initialEntries={["/private"]}>
          <Routes>
            <Route path="/login" element={<div>login</div>} />
            <Route element={<ProtectedRoute />}><Route path="/private" element={<div>private</div>} /></Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider></QueryClientProvider>,
    );
    expect(screen.queryByText("login")).toBeNull();
    expect(screen.queryByText("private")).toBeNull();
    authStorage.setTokens({ accessToken: "synthetic-memory-token" });
    resolve({ id: "1", name: "Synthetic", email: "synthetic@example.test", role: "PSYCHOLOGIST" });
    await waitFor(() => expect(screen.getByText("private")).toBeDefined());
    expect(sessionStorage.getItem("aelo.access_token")).toBeNull();
  });

  it("clears records cached for another account on login, logout and expiry", async () => {
    const client = new QueryClient();
    mockedAuth.restoreSession.mockResolvedValue(null);
    mockedAuth.login.mockResolvedValue({ user: { id: "next", name: "Synthetic", email: "synthetic@example.test", role: "PSYCHOLOGIST" }, tokens: { accessToken: "synthetic-next-token" } });
    mockedAuth.logout.mockResolvedValue(undefined);
    client.setQueryData(["patient", "previous"], { synthetic: true });
    render(<QueryClientProvider client={client}><AuthProvider><SessionControls /></AuthProvider></QueryClientProvider>);
    fireEvent.click(screen.getByText("Entrar teste"));
    await waitFor(() => expect(client.getQueryData(["patient", "previous"])).toBeUndefined());
    client.setQueryData(["patient", "current"], { synthetic: true });
    fireEvent.click(screen.getByText("Sair teste"));
    await waitFor(() => expect(client.getQueryData(["patient", "current"])).toBeUndefined());
    client.setQueryData(["patient", "expired"], { synthetic: true });
    fireEvent(window, new Event("aelo:session-expired"));
    expect(client.getQueryData(["patient", "expired"])).toBeUndefined();
  });
});
