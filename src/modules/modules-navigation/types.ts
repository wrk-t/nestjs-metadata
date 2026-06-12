import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { modules } from "../../schemas/modules";

export type SelectModel = InferSelectModel<typeof modules>;
export type InsertModel = InferInsertModel<typeof modules>;

export { modules };
