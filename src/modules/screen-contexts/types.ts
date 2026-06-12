import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { screenContexts } from "../../schemas/screenContexts";

export type SelectModel = InferSelectModel<typeof screenContexts>;
export type InsertModel = InferInsertModel<typeof screenContexts>;

export { screenContexts };
