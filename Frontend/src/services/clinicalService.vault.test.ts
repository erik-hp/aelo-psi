import { describe, expect, it, vi } from "vitest";
vi.mock("./runtime", () => ({ isApiMode: false }));
import { clinicalService } from "./clinicalService";

describe("Vault offline", () => {
  it("loads a complete synthetic graph for interface development", async () => {
    const graph = await clinicalService.getPatientVault("synthetic-patient");
    expect(graph.nodes).toHaveLength(10);
    expect(graph.edges).toHaveLength(14);
    expect(graph.checkpoints).toHaveLength(2);
    expect(graph.communities.flat()).toHaveLength(10);
  });
});
