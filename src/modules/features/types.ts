import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { features } from "../../schemas/features";

export type SelectModel = InferSelectModel<typeof features>;
export type InsertModel = InferInsertModel<typeof features>;

export { features };
