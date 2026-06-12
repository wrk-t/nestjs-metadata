import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { uiComponents } from "../../schemas/uiComponents";

export type SelectModel = InferSelectModel<typeof uiComponents>;
export type InsertModel = InferInsertModel<typeof uiComponents>;

export { uiComponents };
