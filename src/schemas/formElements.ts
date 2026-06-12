import { relations } from "drizzle-orm";
import { boolean, integer, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { ICompoundCondition, ISimpleCondition } from "../types/conditions";
import { fieldDefinitions } from "./fieldDefinitions";
import { formSections } from "./formSections";
import { forms } from "./forms";
import { uiComponents } from "./uiComponents";

export const formElements = pgTable("form_elements", {
	...ids,
	...timestamps,

	// References
	formId: varchar("form_id", { length: 24 })
		.notNull()
		.references(() => forms.id, { onDelete: "cascade" }),
	sectionId: varchar("section_id", { length: 24 }).references(
		() => formSections.id,
		{
			onDelete: "set null",
		},
	),
	fieldDefinitionId: varchar("field_definition_id", { length: 24 }).references(
		() => fieldDefinitions.id,
		{
			onDelete: "set null",
		},
	),
	uiComponentId: varchar("ui_component_id", { length: 24 }).references(
		() => uiComponents.id,
		{
			onDelete: "set null",
		},
	),

	// Overrides for field definition properties
	fieldOverrides: json("field_overrides").$type<{
		displayName?: string;
		description?: string;
		validations?: Array<
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
		> | null;
		datasource?:
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
			| null;
		defaultValue?: unknown;
		isRequired?: boolean;
		isUnique?: boolean;
	}>(),

	// Overrides for UI template properties
	uiOverrides: json("ui_overrides").$type<{
		component?: string;
		props?: Record<string, unknown>;
		layout?: {
			colSpan?: number;
			rowSpan?: number;
			className?: string;
			style?: Record<string, string>;
		};
		behavior?: {
			autoFocus?: boolean;
			placeholder?: string;
			tooltip?: string;
			prefixIcon?: string;
			suffixIcon?: string;
			readOnly?: boolean;
			disabled?: boolean;
			autoComplete?: string;
			debounce?: number;
			throttle?: number;
		};
	}>(),

	// Instance-specific configuration
	instanceConfig: json("instance_config").$type<{
		// Instance behavior
		isRequired?: boolean;
		isReadOnly?: boolean;
		isHidden?: boolean;

		// Dependencies and conditions
		dependsOn?: string[];
		visibleWhen?: Array<ISimpleCondition | ICompoundCondition>;
		disabledWhen?: Array<ISimpleCondition | ICompoundCondition>;
		requiredWhen?: Array<ISimpleCondition | ICompoundCondition>;

		// Computed values (for virtual fields)
		computedValue?: {
			type: "function" | "expression";
			expression?: string;
			function?: string;
			module?: string;
			dependsOn?: string[];
		};
	}>(),

	// Layout within section
	displayOrder: integer("display_order").default(0),
	colSpan: integer("col_span"),

	// Tenant isolation (null for global/system elements)
	tenantId: varchar("tenant_id", { length: 24 }),

	// Status
	isActive: boolean("is_active").default(true),

	// Additional metadata
	meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const formElementsRelations = relations(formElements, ({ one }) => ({
	form: one(forms, {
		fields: [formElements.formId],
		references: [forms.id],
	}),
	section: one(formSections, {
		fields: [formElements.sectionId],
		references: [formSections.id],
	}),
	fieldDefinition: one(fieldDefinitions, {
		fields: [formElements.fieldDefinitionId],
		references: [fieldDefinitions.id],
	}),
	uiComponent: one(uiComponents, {
		fields: [formElements.uiComponentId],
		references: [uiComponents.id],
	}),
}));
