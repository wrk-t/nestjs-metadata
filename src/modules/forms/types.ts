import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { forms } from "../../schemas/forms";

export type SelectModel = InferSelectModel<typeof forms>;
export type InsertModel = InferInsertModel<typeof forms>;

export { forms };
