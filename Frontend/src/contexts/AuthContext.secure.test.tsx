import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockedAuth = vi.hoisted(() => ({ restoreSession: vi.fn(), login: vi.fn(), logout: vi.fn() }));
vi.mock("@/services/runtime", () => ({ isApiMode: true }));
vi.mock("@/services/authService", () => ({ authService: mockedAuth }));

import { AuthProvider } from "./AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { authStorage } from "@/services/authStorage";

describe("session restoration", () => {
  it("waits for refresh before rendering a protected route", async () => {
    authStorage.clear();
    let resolve!: (value: { id: string; name: string; email: string; role: "PSYCHOLOGIST" }) => void;
    mockedAuth.restoreSession.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/private"]}>
          <Routes>
            <Route path="/login" element={<div>login</div>} />
            <Route element={<ProtectedRoute />}><Route path="/private" element={<div>private</div>} /></Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(screen.queryByText("login")).toBeNull();
    expect(screen.queryByText("private")).toBeNull();
    authStorage.setTokens({ accessToken: "synthetic-memory-token" });
    resolve({ id: "1", name: "Synthetic", email: "synthetic@example.test", role: "PSYCHOLOGIST" });
    await waitFor(() => expect(screen.getByText("private")).toBeDefined());
    expect(sessionStorage.getItem("aelo.access_token")).toBeNull();
  });
});
