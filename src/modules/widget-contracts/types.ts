import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { widgetContracts } from "../../schemas/widgetContracts";

export type SelectModel = InferSelectModel<typeof widgetContracts>;
export type InsertModel = InferInsertModel<typeof widgetContracts>;

export { widgetContracts };
