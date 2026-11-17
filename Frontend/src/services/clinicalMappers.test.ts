import { describe, expect, it } from "vitest";
import { mapAnalysis, mapPatient, type ApiAnalysis } from "./clinicalMappers";

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

  it("preserves documentary inconsistencies without interpreting them as patient risk", () => {
    const mapped = mapAnalysis({ ...analysis(null), possible_inconsistencies: ["Conferir datas."] });
    expect(mapped.documentaryInconsistencies).toEqual(["Conferir datas."]);
    expect(mapped).not.toHaveProperty("riskScenarios");
  });

  it("maps registration status without assigning a clinical risk level", () => {
    const mapped = mapPatient({ id: "synthetic", internal_code: "TEST", display_name: "Sintético", status: "ACTIVE", created_at: "", updated_at: "" });
    expect(mapped.status).toBe("active");
    expect(mapped).not.toHaveProperty("riskLevel");
  });
});
