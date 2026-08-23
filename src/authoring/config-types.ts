import type { fieldDefinitions, IPermissionVisibility } from "../schemas";
import type { IComponentIdentity } from "./nodes";

// ──────────────────────────────────────────────────────────────────
// Reused schema types — derived from the Drizzle insert types so the
// authoring surface can never drift from what seed.ts actually inserts.
// ──────────────────────────────────────────────────────────────────

export type FieldDefRow = typeof fieldDefinitions.$inferInsert;
export type FieldType = NonNullable<FieldDefRow["type"]>;
export type FieldValidations = NonNullable<FieldDefRow["validations"]>;
export type FieldDatasource = NonNullable<FieldDefRow["datasource"]>;

/**
 * Build a `field_definitions` row with the observed seed defaults
 * (`isSystem`, `isActive`) filled in.
 */
export function defineField(id: number, def: Omit<FieldDefRow, "id">): FieldDefRow {
	return { id, isSystem: true, isActive: true, ...def };
}

// ──────────────────────────────────────────────────────────────────
// Column presentation
// ──────────────────────────────────────────────────────────────────

export interface IColumnConfig {
	width?: number;
	sortable?: boolean;
	filterable?: boolean;
	filterType?: "text" | "number" | "select" | "date" | "boolean";
	align?: "left" | "center" | "right";
	format?: {
		type: string;
		props?: Record<string, unknown>;
		displayField?: string;
	};
}

/**
 * Second argument to `Field(...)`. `uiComponentId` is hoisted onto the
 * element row's `uiComponentId` column at compile time — it is not part
 * of the `overrides` JSON blob.
 */
export interface IFieldOverride {
	name?: string;
	displayName?: string;
	description?: string;
	isRequired?: boolean;
	isReadOnly?: boolean;
	isHidden?: boolean;
	placeholder?: string;
	validations?: FieldValidations;
	datasource?: FieldDatasource;
	colSpan?: number;
	columnConfig?: IColumnConfig;
	visibleToPermissions?: IPermissionVisibility[];
	uiComponentId?: number;
}

// ──────────────────────────────────────────────────────────────────
// Per-blueprint configs — the typed replacement for the untyped
// `archComponents.config` json column.
// ──────────────────────────────────────────────────────────────────

export interface IFormActionApiCall {
	action: "apiCall";
	label: string;
	endpoint: string;
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	context?: string;
	successMessage?: string;
}

export interface IFormConfig extends IComponentIdentity {
	settings?: {
		validateOnBlur?: boolean;
		validateOnChange?: boolean;
		confirmOnLeave?: boolean;
	};
	actions?: IFormActionApiCall[];
}

export interface IInfoConfig extends IComponentIdentity {
	datasource: {
		endpoint: string;
		method: "GET" | "POST";
		params?: Record<string, unknown>;
	};
}

export interface ITabsConfig extends IComponentIdentity {
	tabs: Array<{ label: string; icon?: string }>;
}

export interface ISectionConfig extends IComponentIdentity {
	title?: string;
	description?: string;
	collapsible?: boolean;
}

// ── Explicit layout primitives (MUI-aligned) ──────────────────────

export interface IGridConfig extends IComponentIdentity {
	/** true → MUI `<Grid container>`; false/omitted → a grid item. */
	container?: boolean;
	spacing?: number;
	direction?: "row" | "row-reverse" | "column" | "column-reverse";
	alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
	justifyContent?:
		| "flex-start"
		| "center"
		| "flex-end"
		| "space-between"
		| "space-around"
		| "space-evenly";
	/** Responsive item sizes — maps to MUI `size` prop. */
	sizes?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
	offset?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
	order?: number;
}

export interface IStackConfig extends IComponentIdentity {
	direction?: "row" | "column";
	spacing?: number;
	alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
	justifyContent?:
		| "flex-start"
		| "center"
		| "flex-end"
		| "space-between"
		| "space-around"
		| "space-evenly";
}

/** The white-card wrapper (replaces the renderer's hidden BodyCard). */
export interface IContainerConfig extends IComponentIdentity {
	fullBleed?: boolean;
	padding?: number | string;
	radius?: number | string;
	elevation?: number;
	maxWidth?: number | string;
}

// ── Table ─────────────────────────────────────────────────────────

export interface ITableActionBase {
	id?: string;
	label: string;
	icon?: string;
	color?: string;
	condition?: { field: string; operator: string; value?: unknown };
}

export interface IOpenDialogAction extends ITableActionBase {
	action: "openDialog";
	dialog: { componentId: number; context?: string };
}

export interface IApiCallAction extends ITableActionBase {
	action: "apiCall";
	endpoint: string;
	method: string;
	confirm?: { title?: string; message?: string };
	onSuccess?: { refresh?: boolean; message?: string };
}

export type ITableAction = IOpenDialogAction | IApiCallAction;

export interface ITableConfig extends IComponentIdentity {
	datasource: {
		type: "rest";
		endpoint: string;
		method?: "GET" | "POST";
		params?: Record<string, unknown>;
		pagination?: {
			type: "server" | "client";
			defaultPageSize?: number;
			pageSizeOptions?: number[];
		};
		serverSide?: boolean;
	};
	settings?: {
		density?: "compact" | "standard" | "comfortable";
		striped?: boolean;
		searchable?: boolean;
		searchableFields?: string[];
		columnToggle?: boolean;
	};
	toolbarActions?: ITableAction[];
	rowActions?: ITableAction[];
	onRowClick?: {
		redirect?: string;
		fallbackFeature?: string;
		fallbackRedirect?: string;
	};
}
