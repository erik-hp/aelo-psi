import type { VaultGraph } from "@/types/vault";

const ids = Array.from({ length: 10 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
const labels = ["Insônia", "Mudança de turno", "Rotina de sono", "Caminhada", "Sobrecarga", "Apoio familiar", "Sessão inicial", "Exercício", "Ansiedade relatada", "Folga"];
const kinds = ["symptom", "event", "context", "intervention"] as const;
const date = "2026-11-02T12:00:00Z";
export const mockVaultGraph: VaultGraph = {
  nodes: ids.map((id, index) => ({ id, kind: kinds[index % kinds.length], label: labels[index], mention_count: index + 1, weight: (1 + index * 0.2).toFixed(3), first_seen_at: date, last_seen_at: date })),
  edges: Array.from({ length: 14 }, (_, index) => ({ id: `00000000-0000-4000-9000-${String(index + 1).padStart(12, "0")}`, source: ids[index % 10], target: ids[(index + 1) % 10], relation: "associated" as const, evidence: `${labels[index % 10]} e ${labels[(index + 1) % 10]} foram mencionados na nota sintética.`, note_id: "00000000-0000-4000-a000-000000000001", observed_at: date, confidence: "0.700", weight: "0.700" })),
  communities: [ids.slice(0, 5), ids.slice(5)],
  checkpoints: ["VALIDATED", "PENDING_REVIEW"].map((review_status, index) => ({ id: `00000000-0000-4000-b000-${String(index + 1).padStart(12, "0")}`, analysis_id: `00000000-0000-4000-c000-${String(index + 1).padStart(12, "0")}`, review_status: review_status as "VALIDATED" | "PENDING_REVIEW", reviewed_by: index === 0 ? "Profissional de exemplo" : null, reviewed_at: index === 0 ? date : null, node_count: 10, edge_count: 14, created_at: date, content_sha256: "8a35f79a95bc68b8e62d4e892c902d33458a2d1e2b3c4d5e6f7a8b9c0d1e2f3a" })),
};
