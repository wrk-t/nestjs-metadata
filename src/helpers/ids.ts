import { createId } from "@paralleldrive/cuid2";
import { varchar } from "drizzle-orm/pg-core";

export const ids = {
	// id: serial("id").primaryKey().notNull(),
	id: varchar("id", { length: 24 })
		.$defaultFn(() => createId())
		.primaryKey()
		.notNull(),
};
