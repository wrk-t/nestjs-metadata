import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { screens } from "../../schemas/screens";

export type SelectModel = InferSelectModel<typeof screens>;
export type InsertModel = InferInsertModel<typeof screens>;

export { screens };
