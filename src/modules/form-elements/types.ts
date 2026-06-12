import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { formElements } from "../../schemas/formElements";

export type SelectModel = InferSelectModel<typeof formElements>;
export type InsertModel = InferInsertModel<typeof formElements>;

export { formElements };
