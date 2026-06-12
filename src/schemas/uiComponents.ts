import {
	boolean,
	integer,
	json,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";

export const uiComponents = pgTable("ui_components", {
	...ids,
	...timestamps,

	// ── Identification ──
	name: varchar("name", { length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 255 }),
	description: text("description"),

	// ── Component type (discriminant for the frontend union) ──
	// "text", "textarea", "number", "email", "password",
	// "select", "multiselect", "radio", "checkbox", "switch",
	// "date", "datetime", "time",
	// "file", "image",
	// "richtext", "json",
	// "reference", "autocomplete"
	componentType: varchar("component_type", { length: 50 }).notNull(),

	// ── Config props schema ──
	// Defines what props this component accepts.
	// Each component type defines its own specific shape:
	//   text       → { placeholder?, maxLength?, prefixIcon?, suffixIcon?, autoComplete? }
	//   select     → { placeholder?, multiple? }
	//   number     → { placeholder?, min?, max?, step?, prefixIcon?, suffixIcon? }
	//   textarea   → { placeholder?, rows?, maxLength? }
	//   date       → { placeholder?, min?, max? }
	//   file       → { accept?, multiple?, maxSize? }
	//   autocomplete → { placeholder?, debounce? }
	//   etc.
	configProps: json("config_props")
		.$type<Record<string, unknown>>()
		.default({}),

	// ── Which fieldDefinition types this component can render ──
	// null = compatible with all types
	compatibleFieldTypes: json("compatible_field_types").$type<string[] | null>(),

	// ── Ordering ──
	displayOrder: integer("display_order").default(0),
	category: varchar("category", { length: 100 }),
	tags: json("tags").$type<string[] | null>(),

	// ── Tenant isolation ──
	tenantId: varchar("tenant_id", { length: 24 }),

	// ── Status ──
	isActive: boolean("is_active").default(true).notNull(),
	isSystem: boolean("is_system").default(false).notNull(),

	// ── Metadata ──
	meta: json("meta").$type<Record<string, unknown> | null>(),
});
