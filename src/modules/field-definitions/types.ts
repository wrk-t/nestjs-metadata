import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { fieldDefinitions } from "../../schemas/fieldDefinitions";

export type SelectModel = InferSelectModel<typeof fieldDefinitions>;
export type InsertModel = InferInsertModel<typeof fieldDefinitions>;

export { fieldDefinitions };
