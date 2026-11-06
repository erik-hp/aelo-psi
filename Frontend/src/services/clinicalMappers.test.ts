import { describe, expect, it } from "vitest";
import { mapAnalysis, type ApiAnalysis } from "./clinicalMappers";

function analysis(value: ApiAnalysis["relevance_score"]): ApiAnalysis {
  return { id: "synthetic", patient: "synthetic", status: "PENDING_REVIEW", patterns: [], longitudinal_evolution: "", attention_points: [], longitudinal_coherence: "", relevance_score: value, sources: [] };
}
describe("Missing operational metrics", () => {
  it.each([null, "", "invalid"])("preserves %s as unavailable rather than inventing a zero", (value) => {
    expect(mapAnalysis(analysis(value)).relevanceScore).toBeNull();
  });
  it("keeps an explicit zero distinct from unavailable", () => {
    expect(mapAnalysis(analysis(0)).relevanceScore).toBe(0);
  });
});
