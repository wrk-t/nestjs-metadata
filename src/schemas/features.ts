import { json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";

export const features = pgTable("features", {
	...ids,
	...timestamps,
	name: varchar("name", { length: 100 }),
	displayName: varchar("display_name", { length: 255 }),
	description: varchar("description", { length: 500 }),
	meta: json("meta").$type<Record<string, unknown> | null>(),
});
