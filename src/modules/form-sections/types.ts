import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { formSections } from "../../schemas/formSections";

export type SelectModel = InferSelectModel<typeof formSections>;
export type InsertModel = InferInsertModel<typeof formSections>;

export { formSections };
