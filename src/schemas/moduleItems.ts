import { relations } from "drizzle-orm";
import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { modules } from "./modules";

/**
 * MODULE ITEMS
 *
 * Junction table linking modules to their constituent resources
 * (tables, forms, etc.). A module is a bundle of items — each item
 * represents a primary resource that appears in the module's
 * navigation or default screen.
 *
 * This is a lightweight, flat list. The module's full screen layout
 * is managed via the `screens` and `screenWidgets` tables.
 */
export const moduleItems = pgTable("module_items", {
	...ids,
	...timestamps,

	// ── References ─────────────────────────────────────────────
	moduleId: varchar("module_id", { length: 24 })
		.notNull()
		.references(() => modules.id, { onDelete: "cascade" }),

	// ── Resource ───────────────────────────────────────────────
	resourceType: varchar("resource_type", {
		length: 50,
		enum: ["table", "form"],
	}).notNull(),

	resourceId: varchar("resource_id", { length: 24 }).notNull(),

	// ── Order ──────────────────────────────────────────────────
	displayOrder: integer("display_order").default(0),
});

export const moduleItemsRelations = relations(moduleItems, ({ one }) => ({
	module: one(modules, {
		fields: [moduleItems.moduleId],
		references: [modules.id],
	}),
}));
