import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { tables } from "../../schemas/tables";

export type SelectModel = InferSelectModel<typeof tables>;
export type InsertModel = InferInsertModel<typeof tables>;

export { tables };

// ── Table render types ─────────────────────────────────────

export interface ITableRenderResponse {
  table: Record<string, any>;
  columns: Record<string, any>[];
}
