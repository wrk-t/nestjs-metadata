import { relations } from "drizzle-orm";
import { boolean, integer, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { fieldTypeEnum } from "../helpers/enums";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { ICompoundCondition, ISimpleCondition } from "../types/conditions";

export const fieldDefinitions = pgTable("field_definitions", {
	...ids,
	...timestamps,

	// ── Field identification ──
	name: varchar("name", { length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 255 }).notNull(),
	type: fieldTypeEnum("type").notNull(),

	// ── Defaults ──
	defaultValue: json("default_value"),
	validations:
		json("validations").$type<
			Array<
				| ["Required", string?]
				| ["IsString"]
				| ["IsNumber"]
				| ["IsBoolean"]
				| ["IsDate"]
				| ["IsEmail", string?]
				| ["IsUrl"]
				| ["MinLength", number, string?]
				| ["MaxLength", number, string?]
				| ["Min", number, string?]
				| ["Max", number, string?]
				| ["Pattern", string, string?]
				| ["Unique"]
				| ["Custom", string]
			>
		>(),
	datasource: json("datasource").$type<
		| {
				type: "service";
				endpoint: string;
				method: "GET" | "POST";
				params?: Record<string, unknown>;
				dependsOn?: string[];
				transform?: string;
		  }
		| {
				type: "function";
				module: string;
				function: string;
				params?: unknown[];
				dependsOn?: string[];
		  }
		| {
				type: "static";
				options: Array<{
					label: string;
					value: unknown;
					disabled?: boolean;
				}>;
		  }
		| {
				type: "sql";
				query: string;
				connection?: string;
				dependsOn?: string[];
		  }
		| {
				type: "entity";
				/** Target entity/table name (e.g. "users", "tenants") */
				entity: string;
				/** Field whose value is shown in the dropdown (e.g. "email", "displayName") */
				displayField: string;
				/** Field whose value is submitted (defaults to "id") */
				valueField?: string;
				/** Fields searched as the user types (for autocomplete). Defaults to [displayField]. */
				searchFields?: string[];
				/** Static pre-filter applied to every fetch */
				filter?: { field: string; value: unknown };
				/** Sort order for the result set */
				orderBy?: { field: string; direction: "asc" | "desc" };
				/** Fields from the parent form that this lookup depends on (for cascading) */
				dependsOn?: string[];
		  }
	>(),

	// ── Default UI config ──
	uiComponentId: varchar("ui_component_id", { length: 24 }),
	configProps: json("config_props")
		.$type<Record<string, unknown>>()
		.default({}),

	// ── Conditional logic ──
	dependsOn: json("depends_on").$type<string[]>(),
	visibleWhen:
		json("visible_when").$type<Array<ISimpleCondition | ICompoundCondition>>(),
	disabledWhen:
		json("disabled_when").$type<Array<ISimpleCondition | ICompoundCondition>>(),
	requiredWhen:
		json("required_when").$type<Array<ISimpleCondition | ICompoundCondition>>(),

	// ── Context behavior defaults ──
	readonlyOnCreate: boolean("readonly_on_create").default(false),
	readonlyOnUpdate: boolean("readonly_on_update").default(false),
	hideOnCreate: boolean("hide_on_create").default(false),
	hideOnUpdate: boolean("hide_on_update").default(false),
	hideOnTable: boolean("hide_on_table").default(false),

	// ── Permission-based visibility ──
	visibleToPermissions: json("visible_to_permissions").$type<
		Array<{
			resource: string;
			action: string;
			scope?: "own" | "tenant" | "all";
		}>
	>(),

	// @deprecated — replaced by visibleToPermissions
	visibleToRoles: json("visible_to_roles").$type<string[]>(),

	// ── Ordering ──
	order: integer("order").default(0),

	// ── Categorization ──
	category: varchar("category", { length: 100 }),

	// ── Tenant ──
	tenantId: varchar("tenant_id", { length: 24 }),

	// ── Status ──
	isActive: boolean("is_active").default(true),
	isSystem: boolean("is_system").default(false),

	// ── Metadata ──
	meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const fieldDefinitionsRelations = relations(
	fieldDefinitions,
	() => ({}),
);
