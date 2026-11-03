import { z } from "zod";

const uuid = z.uuid();
const decimal = z.string().regex(/^\d+(?:\.\d+)?$/);
const timestamp = z.iso.datetime({ offset: true });
export const vaultNodeSchema = z.object({ id: uuid, kind: z.enum(["symptom", "event", "context", "intervention"]), label: z.string().min(1).max(120), mention_count: z.number().int().nonnegative(), weight: decimal, first_seen_at: timestamp, last_seen_at: timestamp });
export const vaultEdgeSchema = z.object({ id: uuid, source: uuid, target: uuid, relation: z.enum(["co_occurs", "precedes", "reports", "associated"]), evidence: z.string().min(1).max(240), note_id: uuid, observed_at: timestamp, confidence: decimal, weight: decimal });
export const vaultCheckpointSummarySchema = z.object({ id: uuid, analysis_id: uuid, review_status: z.enum(["PENDING_REVIEW", "VALIDATED", "REJECTED"]), reviewed_by: z.string().nullable(), reviewed_at: timestamp.nullable(), node_count: z.number().int().nonnegative(), edge_count: z.number().int().nonnegative(), created_at: timestamp, content_sha256: z.string().optional() });
export const vaultGraphSchema = z.object({ nodes: z.array(vaultNodeSchema), edges: z.array(vaultEdgeSchema), communities: z.array(z.array(uuid)), checkpoints: z.array(vaultCheckpointSummarySchema) });
export const vaultCheckpointDetailSchema = z.object({ id: uuid, markdown: z.string(), content_sha256: z.string().regex(/^[0-9a-f]{64}$/), review_status: z.enum(["PENDING_REVIEW", "VALIDATED", "REJECTED"]) });
