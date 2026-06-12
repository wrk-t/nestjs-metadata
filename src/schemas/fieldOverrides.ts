import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	json,
	pgTable,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { ICompoundCondition, ISimpleCondition } from "../types/conditions";
import { forms } from "./forms";

export const fieldOverrides = pgTable(
	"field_overrides",
	{
		...ids,
		...timestamps,

		// ── References ──
		formId: varchar("form_id", { length: 24 }).notNull(),
		// Null = this is a new field being added by the tenant
		elementId: varchar("element_id", { length: 24 }),
		// The tenant making the override
		tenantId: varchar("tenant_id", { length: 24 })
			.notNull()
			,

		// ── Display overrides ──
		displayName: varchar("display_name", { length: 255 }),
		description: text("description"),

		// ── Behavior overrides ──
		isHidden: boolean("is_hidden"),
		isRequired: boolean("is_required"),
		isReadOnly: boolean("is_read_only"),

		// ── UI config overrides ──
		placeholder: varchar("placeholder", { length: 255 }),
		tooltip: text("tooltip"),

		// ── Validation overrides ──
		validations: json("validations").$type<Array<
			| ["Required"]
			| ["IsString"]
			| ["IsNumber"]
			| ["IsBoolean"]
			| ["IsDate"]
			| ["IsEmail"]
			| ["IsUrl"]
			| ["MinLength", number]
			| ["MaxLength", number]
			| ["Min", number]
			| ["Max", number]
			| ["Pattern", string]
			| ["Unique"]
			| ["Custom", string]
		> | null>(),

		// ── Datasource override ──
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
			| null
		>(),

		// ── Default value override ──
		defaultValue: json("default_value"),

		// ── For new fields (elementId IS NULL) ──
		fieldDefinitionId: varchar("field_definition_id", { length: 24 }),
		uiComponentId: varchar("ui_component_id", { length: 24 }),
		displayOrder: integer("display_order"),
		colSpan: integer("col_span"),
		sectionId: varchar("section_id", { length: 24 }),

		// ── Conditional logic ──
		visibleWhen: json("visible_when").$type<Array<
			ISimpleCondition | ICompoundCondition
		> | null>(),
		disabledWhen: json("disabled_when").$type<Array<
			ISimpleCondition | ICompoundCondition
		> | null>(),

		// ── Metadata ──
		meta: json("meta").$type<Record<string, unknown> | null>(),
	},
	(table) => ({
		// A tenant can only override a specific element once
		uniqueFieldOverride: uniqueIndex("uq_field_override").on(
			table.elementId,
			table.tenantId,
		),
	}),
);

export const fieldOverridesRelations = relations(fieldOverrides, ({ one }) => ({
	form: one(forms, {
		fields: [fieldOverrides.formId],
		references: [forms.id],
	}),
}));
