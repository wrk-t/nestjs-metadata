import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	json,
	pgTable,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { archComponents } from "./arch";

// ──────────────────────────────────────────────────────────────────
// ENTITY TYPES — the schema catalog for domain entities (menu items,
// categories, …) whose shape is defined per TEMPLATE.
//
// A domain table (e.g. menu_items) keeps its structural columns as the
// thin core and stores template-defined extras in a `data` jsonb column;
// `type_id` on the row references the EXACT entity type version that
// typed it, so old data stays renderable even after a template switch.
//
// Rows are immutable-per-version snapshots: changing a type's fields
// creates a NEW version (same `key`, higher `version`). Templates
// reference the current version; rows reference the version that typed
// them. `baseEntityTypeId` gives inheritance — common fields live in
// the base once (`menu_item`) and templates extend it
// (`wine_pairing_item extends menu_item`).
// ──────────────────────────────────────────────────────────────────

export type TEntityTypeFieldType =
	| "text"
	| "textarea"
	| "number"
	| "select"
	| "switch"
	| "checkbox"
	| "date"
	| "email"
	| "image"
	| "color"
	| "json";

export interface IEntityTypeField {
	/** Field key — also the `data` jsonb key for template-defined fields. */
	name: string;
	type: TEntityTypeFieldType;
	label: string;
	required?: boolean;
	/** When true the value is a locale map ({ en, fa }). */
	translatable?: boolean;
	/** Select options. */
	options?: Array<{ label: string; value: string }>;
	defaultValue?: unknown;
	/**
	 * When the field maps to a CORE COLUMN of the domain table
	 * (e.g. "price" → menu_items.price), the adapter reads/writes the
	 * column instead of `data`. Resolved by name by the domain adapter.
	 */
	column?: string;
}

export const entityTypes = pgTable(
	"entity_types",
	{
		...ids,
		...timestamps,
		// Identity — one key, many versions.
		key: varchar("key", { length: 100 }).notNull(),
		version: integer("version").default(1).notNull(),
		name: varchar("name", { length: 100 }).notNull(),
		displayName: varchar("display_name", { length: 255 }).notNull(),
		description: varchar("description", { length: 500 }),
		// Inheritance — the base type this one extends (fields merge in).
		baseEntityTypeId: integer("base_entity_type_id").references(
			(): any => entityTypes.id,
		),
		// The schema — the full field list (core columns + template extras).
		fields: json("fields").$type<IEntityTypeField[]>().notNull(),
		// Component refs — how the type renders + how it is managed.
		renderComponentId: integer("render_component_id").references(
			(): any => archComponents.id,
		),
		manageFormId: integer("manage_form_id").references(
			(): any => archComponents.id,
		),
		manageTableId: integer("manage_table_id").references(
			(): any => archComponents.id,
		),
		// Status
		isActive: boolean("is_active").default(true).notNull(),
		isSystem: boolean("is_system").default(false).notNull(),
		tenantId: varchar("tenant_id", { length: 24 }),
		meta: json("meta").$type<Record<string, unknown> | null>(),
	},
	(table) => [
		uniqueIndex("entity_types_key_version_uniq").on(table.key, table.version),
	],
);

export const entityTypesRelations = relations(entityTypes, ({ one }) => ({
	baseEntityType: one(entityTypes, {
		fields: [entityTypes.baseEntityTypeId],
		references: [entityTypes.id],
		relationName: "baseEntityType",
	}),
}));
