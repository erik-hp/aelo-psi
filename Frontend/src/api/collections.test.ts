import { beforeEach, describe, expect, it, vi } from "vitest";
const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("./client", () => ({ apiClient: http }));
import { getCollection } from "./collections";
beforeEach(() => http.get.mockReset());
describe("Complete scoped DRF collections", () => {
  it("loads later pages on the same endpoint preserving the patient filter", async () => {
    http.get.mockResolvedValueOnce({ data: { results: [{ id: "first" }], next: "http://api.local/api/sessions/?patient=p&page=2" } }).mockResolvedValueOnce({ data: { results: [{ id: "last" }], next: null } });
    await expect(getCollection("/sessions/", { patient: "p" })).resolves.toEqual([{ id: "first" }, { id: "last" }]);
    expect(http.get).toHaveBeenNthCalledWith(2, "/sessions/", { params: { patient: "p", page: "2" } });
  });
  it("does not forward authentication to a supplied next URL", async () => {
    http.get.mockResolvedValueOnce({ data: { results: [], next: "https://untrusted.invalid/secret?page=2" } }).mockResolvedValueOnce({ data: { results: [], next: null } });
    await getCollection("/patients/");
    expect(http.get).toHaveBeenNthCalledWith(2, "/patients/", { params: { page: "2" } });
  });
  it("fails explicitly on repeated pagination instead of looping", async () => {
    http.get.mockResolvedValue({ data: { results: [], next: "?page=2" } });
    await expect(getCollection("/patients/")).rejects.toThrow("Paginação inválida");
  });
});
