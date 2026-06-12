import { relations } from "drizzle-orm";
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
import { fieldDefinitions } from "./fieldDefinitions";
import { tables } from "./tables";
import { uiComponents } from "./uiComponents";

export const tableColumnInstances = pgTable("table_column_instances", {
	...ids,
	...timestamps,

	// Reference to the table metadata this column belongs to
	tableMetadataId: varchar("table_metadata_id", { length: 24 })
		.references(() => tables.id, { onDelete: "cascade" })
		.notNull(),

	// Optional references to field definition and UI template for reuse
	fieldDefinitionId: varchar("field_definition_id", { length: 24 }).references(
		() => fieldDefinitions.id,
		{
			onDelete: "set null",
		},
	),
	uiTemplateId: varchar("ui_template_id", { length: 24 }).references(
		() => uiComponents.id,
		{
			onDelete: "set null",
		},
	),

	// Overrides for field definition properties
	fieldOverrides: json("field_overrides").$type<{
		name?: string;
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

	// Table-specific column configuration
	columnConfig: json("column_config").$type<{
		// Sizing
		width?: string | number;
		minWidth?: string | number;
		maxWidth?: string | number;

		// Alignment
		align?: "left" | "center" | "right" | "justify";

		// Behavior
		sortable?: boolean;
		filterable?: boolean;
		resizable?: boolean;
		draggable?: boolean;
		hideable?: boolean;
		pinnable?: boolean;
		editable?: boolean;

		// Filter configuration
		filterType?:
			| "text"
			| "select"
			| "date"
			| "number"
			| "boolean"
			| "multi-select";
		filterOptions?: Array<{
			label: string;
			value: unknown;
			disabled?: boolean;
		}>;
		filterPlaceholder?: string;
		filterDebounce?: number;

		// Sort configuration
		sortFn?: string; // function reference for custom sorting
		sortOrder?: "asc" | "desc";

		// Cell rendering
		cellRenderer?: string; // function reference for custom cell rendering
		cellClassName?: string;
		cellStyle?: Record<string, string | number>;

		// Header rendering
		headerRenderer?: string; // function reference for custom header rendering
		headerClassName?: string;
		headerStyle?: Record<string, string | number>;

		// Tooltip
		tooltip?: string;
		tooltipRenderer?: string;

		// Formatting for display
		format?: {
			type?:
				| "text"
				| "badge"
				| "tag"
				| "avatar"
				| "progress"
				| "rating"
				| "boolean"
				| "date"
				| "number";
			props?: Record<string, unknown>;
			transform?: string;
			pattern?: string;
			prefix?: string;
			suffix?: string;
			decimalSeparator?: string;
			thousandSeparator?: string;
			decimalScale?: number;
			dateFormat?: string;
			timeFormat?: string;
		};

		// Aggregation
		aggregatable?: boolean;
		aggregationType?: "sum" | "avg" | "count" | "min" | "max";
		aggregationRenderer?: string;

		// Grouping
		groupable?: boolean;
		groupRenderer?: string;

		// Expand/collapse
		expandable?: boolean;
		expandRenderer?: string;

		// Selection
		selectable?: boolean;
		selectionType?: "checkbox" | "radio";

		// Actions
		actions?: Array<{
			type: "button" | "icon" | "dropdown" | "link";
			label?: string;
			icon?: string;
			action: string; // function reference
			props?: Record<string, unknown>;
			conditions?: Record<string, unknown>[];
		}>;
	}>(),

	// Instance-specific configuration
	instanceConfig: json("instance_config").$type<{
		// Visibility and behavior
		isVisible?: boolean;
		isRequired?: boolean;
		isReadOnly?: boolean;
		isHidden?: boolean;

		// Dependencies and conditions
		dependsOn?: string[];
		visibleWhen?: Record<string, unknown>[];
		disabledWhen?: Record<string, unknown>[];
		requiredWhen?: Record<string, unknown>[];

		// Computed values (for virtual columns)
		computedValue?: {
			type: "function" | "expression";
			expression?: string;
			function?: string;
			module?: string;
			dependsOn?: string[];
		};
	}>(),

	// Display order within table
	displayOrder: integer("display_order").default(0),

	// Fixed position (for sticky columns)
	fixedPosition: varchar("fixed_position", {
		length: 10,
		enum: ["left", "right", "none"],
	}).default("none"),

	// Column group (for grouping columns under a header)
	columnGroup: varchar("column_group", { length: 100 }),

	// Description
	description: text("description"),

	// Tenant isolation (null for global/system columns)
	tenantId: varchar("tenant_id", { length: 24 }),

	// Status
	isActive: boolean("is_active").default(true),
	isSystem: boolean("is_system").default(false),

	// Additional metadata
	meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const tableColumnInstancesRelations = relations(
	tableColumnInstances,
	({ one }) => ({
		table: one(tables, {
			fields: [tableColumnInstances.tableMetadataId],
			references: [tables.id],
		}),
		fieldDefinition: one(fieldDefinitions, {
			fields: [tableColumnInstances.fieldDefinitionId],
			references: [fieldDefinitions.id],
		}),
		uiTemplate: one(uiComponents, {
			fields: [tableColumnInstances.uiTemplateId],
			references: [uiComponents.id],
		}),
	}),
);
