import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { tableColumnInstances } from "../../schemas/tableColumnInstances";

export type SelectModel = InferSelectModel<typeof tableColumnInstances>;
export type InsertModel = InferInsertModel<typeof tableColumnInstances>;

export { tableColumnInstances };
