import { integer } from "drizzle-orm/pg-core";

export const ids = {
	// Metadata ids are static integers for seeds (registry in cuid.ts),
	// auto-incremented by the database for runtime-created rows.
	// `generatedByDefaultAsIdentity` allows explicit values in seeds.
	id: integer("id").generatedByDefaultAsIdentity().primaryKey().notNull(),
};
