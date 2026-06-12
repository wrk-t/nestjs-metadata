import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { screenWidgets } from "../../schemas/screenWidgets";

export type SelectModel = InferSelectModel<typeof screenWidgets>;
export type InsertModel = InferInsertModel<typeof screenWidgets>;

export { screenWidgets };

// ── Widget parameter types ─────────────────────────────────

export interface IWidgetParam {
  name: string;
  type: "string" | "number" | "boolean";
  required?: boolean;
  defaultValue?: unknown;
}

export interface IWidgetParamBinding {
  source: "literal" | "scope" | "screen";
  value?: string;
}
