export type VaultNodeKind = "symptom" | "event" | "context" | "intervention";
export type VaultRelationType = "co_occurs" | "precedes" | "reports" | "associated";
export type VaultReviewStatus = "PENDING_REVIEW" | "VALIDATED" | "REJECTED";
export interface VaultNode { id: string; kind: VaultNodeKind; label: string; mention_count: number; weight: string; first_seen_at: string; last_seen_at: string }
export interface VaultEdge { id: string; source: string; target: string; relation: VaultRelationType; evidence: string; note_id: string; observed_at: string; confidence: string; weight: string }
export interface VaultCheckpointSummary { id: string; analysis_id: string; review_status: VaultReviewStatus; reviewed_by: string | null; reviewed_at: string | null; node_count: number; edge_count: number; created_at: string; content_sha256?: string }
export interface VaultGraph { nodes: VaultNode[]; edges: VaultEdge[]; communities: string[][]; checkpoints: VaultCheckpointSummary[] }
export interface VaultCheckpointDetail { id: string; markdown: string; content_sha256: string; review_status: VaultReviewStatus }
