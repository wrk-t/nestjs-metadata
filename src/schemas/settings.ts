import { boolean, json, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";

/**
 * SETTINGS — canonical settings definitions (the "settings catalog").
 *
 * Each row defines a named setting that every tenant gets on creation
 * (language, date format, calendar, …). Per-tenant values live in the
 * main DB `tenant_settings` table, keyed by `settings.name`.
 */
export const settings = pgTable("settings", {
	...ids,
	...timestamps,
	name: varchar("name", { length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 255 }),
	description: varchar("description", { length: 500 }),
	/** UI hint: "text" | "select" | "boolean" | "number" … */
	type: varchar("type", { length: 50 }).default("text").notNull(),
	defaultValue: text("default_value"),
	/** For "select" settings — the allowed options. */
	options: json("options").$type<Array<{ label: string; value: string }> | null>(),
	/**
	 * Format contract for the setting's value:
	 *  - { kind: "regex", pattern, example? } → text values must match the
	 *    regex pattern (e.g. email, phone).
	 *  - { kind: "select", example? } → value must be one of `options`.
	 *  - null → free-form value (numbers/booleans are still coerced).
	 */
	format: json("format").$type<
		| { kind: "regex"; pattern: string; example?: string }
		| { kind: "select"; example?: string }
		| null
	>(),
	isSystem: boolean("is_system").default(false).notNull(),
	meta: json("meta").$type<Record<string, unknown> | null>(),
});

/**
 * Relations are declared (even empty) so the table is registered in the
 * Drizzle relational query API (`db.query.settings`) used by the generic
 * repository `findMany`.
 */
export const settingsRelations = relations(settings, () => ({}));
