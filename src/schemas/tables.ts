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
import { tableColumnInstances } from "./tableColumnInstances";

export const tables = pgTable("table_metadata", {
	...ids,
	...timestamps,

	// Basic table information
	name: varchar("name", { length: 100 }).notNull(),

	// Reference to entity (optional - for database-backed tables)
	entityId: varchar("entity_id", { length: 128 }),

	// Entity/table name for datasource (required for datasource configuration)
	entity: varchar("entity", { length: 100 }).notNull(),

	title: varchar("title", { length: 255 }).notNull(),
	description: text("description"),

	// Data Source configuration
	datasource: json("datasource")
		.$type<{
			type: "rest" | "graphql" | "sql";
			endpoint: string;
			method?: "GET" | "POST";
			params?: Record<string, string>;
			pagination: {
				type: "offset" | "cursor";
				defaultPageSize: number;
				pageSizeOptions: number[];
			};
			serverSide?: boolean;
		}>()
		.notNull(),

	// Selection configuration
	selection: json("selection").$type<{
		enabled: boolean;
		type: "single" | "multiple";
		actions: Array<{
			id: string;
			label: string;
			icon?: string;
			type: "button" | "dropdown" | "link";
			condition?: {
				field: string;
				operator:
					| "eq"
					| "ne"
					| "gt"
					| "lt"
					| "contains"
					| "in"
					| "notEmpty"
					| "isEmpty";
				value?: unknown;
			};
			action?:
				| "view"
				| "edit"
				| "delete"
				| "custom"
				| "openDialog"
				| "selectionTable";
			customAction?: string;
			redirect?: string;
			endpoint?: string;
			method?: "POST" | "PUT" | "PATCH" | "DELETE";
			permissions?: string[];
			color?: string;
			placement?: "top-toolbar" | "toolbar-actions";
			dialog?: { formId: string; context?: string };
			selectionTable?: {
				tableId: string;
				endpoint: string;
				method?: string;
				metaFieldsEndpoint?: string;
				title?: string;
			};
			confirm?: {
				title: string;
				message: string;
			};
		}>;
	}>(),

	// Row Actions
	rowActions: json("row_actions")
		.$type<
			Array<
				{
					id: string;
					label: string;
					icon?: string;
					color?: string;
					condition?: {
						field: string;
						operator:
							| "eq"
							| "ne"
							| "gt"
							| "lt"
							| "contains"
							| "in"
							| "notEmpty"
							| "isEmpty";
						value?: unknown;
					};
					permissions?: string[];
					confirm?: { title: string; message: string };
				} & (
					| {
							action: "openDialog";
							dialog: { formId: string; context?: "create" | "edit" | "view" };
					  }
					| {
							action: "navigate";
							path: string;
					  }
					| {
							action: "apiCall";
							endpoint: string;
							method: "POST" | "PUT" | "PATCH" | "DELETE";
							onSuccess?: "refreshTable" | "closeDialog" | "navigate";
							successRedirect?: string;
							onError?: "showSnackbar";
					  }
					| {
							action: "custom";
							customAction: string;
					  }
					| {
							action: "selectionTable";
							selectionTable: {
								tableId: string;
								endpoint: string;
								method?: string;
								formId?: string;
								title?: string;
							};
					  }
					// ── Legacy format (pre-refactor) ──
					| {
							type?: "button" | "dropdown" | "link";
							action?:
								| "view"
								| "edit"
								| "delete"
								| "custom"
								| "openDialog"
								| "selectionTable";
							redirect?: string;
							endpoint?: string;
							method?: "POST" | "PUT" | "PATCH" | "DELETE";
							customAction?: string;
					  }
				)
			>
		>()
		.notNull(),

	// Toolbar Actions
	toolbarActions: json("toolbar_actions")
		.$type<
			Array<
				{
					id: string;
					label: string;
					icon?: string;
					iconOn?: string;
					iconOff?: string;
					color?: string;
					placement?: "top-toolbar" | "toolbar-actions";
					condition?: {
						field: string;
						operator:
							| "eq"
							| "ne"
							| "gt"
							| "lt"
							| "contains"
							| "in"
							| "notEmpty"
							| "isEmpty";
						value?: unknown;
					};
					permissions?: string[];
					confirm?: { title: string; message: string };
				} & (
					| {
							action: "openDialog";
							dialog: { formId: string; context?: "create" | "edit" | "view" };
					  }
					| {
							action: "navigate";
							path: string;
					  }
					| {
							action: "apiCall";
							endpoint: string;
							method: "POST" | "PUT" | "PATCH" | "DELETE";
							onSuccess?: "refreshTable" | "closeDialog" | "navigate";
							successRedirect?: string;
							onError?: "showSnackbar";
					  }
					| {
							action: "custom";
							customAction: string;
					  }
					| {
							action: "selectionTable";
							selectionTable: {
								tableId: string;
								endpoint: string;
								method?: string;
								formId?: string;
								title?: string;
							};
					  }
					// ── Legacy format (pre-refactor) ──
					| {
							type?: "button" | "dropdown" | "link";
							action?:
								| "view"
								| "edit"
								| "delete"
								| "custom"
								| "openDialog"
								| "selectionTable";
							redirect?: string;
							endpoint?: string;
							method?: "POST" | "PUT" | "PATCH" | "DELETE";
							customAction?: string;
					  }
				)
			>
		>()
		.notNull(),

	// Settings configuration
	settings: json("settings")
		.$type<{
			density: "compact" | "normal" | "comfortable";
			striped: boolean;
			bordered: boolean;
			stickyHeader: boolean;
			resizableColumns: boolean;
			exportable: boolean;
			importable: boolean;
			refreshable: boolean;
			searchable: boolean;
			searchableFields?: string[];
			columnToggle: boolean;
		}>()
		.notNull(),

	// Expandable rows configuration
	expandable: json("expandable").$type<{
		enabled: boolean;
		component: string;
	}>(),

	// Empty state configuration
	emptyState: json("empty_state").$type<{
		title: string;
		description?: string;
		action?: string;
	}>(),

	// Tenant isolation (null for global/system tables)
	tenantId: varchar("tenant_id", { length: 24 }),

	// Status and categorization
	isActive: boolean("is_active").default(true),
	isSystem: boolean("is_system").default(false),
	category: varchar("category", { length: 100 }),

	// Order for display
	displayOrder: integer("display_order").default(0),

	// Additional metadata
	meta: json("meta").$type<Record<string, unknown> | null>(),

	// Sub-table reference — links to another table config for expandable drill-down rows.
	// When set, clicking a row triggers fetching the referenced table's data with the
	// parent row's id injected into the sub-table's datasource endpoint placeholders.
	subTable: json("sub_table").$type<{
		/** Name of another table_metadata row to use for nested rows. */
		tableName: string;
		/** The target table's ID (for direct render endpoint lookup). */
		tableId: string;
	}>(),

	// Row click action — triggered when a table row is clicked
	onRowClick: json("on_row_click").$type<{
		redirect?: string;
		endpoint?: string;
		method?: "POST" | "PUT" | "PATCH" | "DELETE";
		permissions?: string[];
	}>(),
});

export const tablesRelations = relations(tables, ({ many }) => ({
	columns: many(tableColumnInstances),
}));
