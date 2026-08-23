import type { fieldDefinitions, IPermissionVisibility } from "../schemas";
import type { AuthoringChild, IComponentIdentity } from "./nodes";

// ──────────────────────────────────────────────────────────────────
// Reused schema types — derived from the Drizzle insert types so the
// authoring surface can never drift from what seed.ts actually inserts.
// ──────────────────────────────────────────────────────────────────

export type FieldDefRow = typeof fieldDefinitions.$inferInsert;
export type FieldType = NonNullable<FieldDefRow["type"]>;
export type FieldValidations = NonNullable<FieldDefRow["validations"]>;
export type FieldDatasource = NonNullable<FieldDefRow["datasource"]>;

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
 * Config for a leaf field node (TextField, PasswordField, …).
 * `id` doubles as the field_definitions id — reuse the same id (or the
 * same instance) to share a field definition across screens.
 * Instance specifics (isRequired, placeholder, validations, colSpan) are
 * emitted as element overrides; `uiComponentId` is hoisted onto the
 * element row's column.
 */
export interface IFieldConfig extends IComponentIdentity {
	/** Alias for displayName (React-style). */
	label?: string;
	placeholder?: string;
	isRequired?: boolean;
	isReadOnly?: boolean;
	isHidden?: boolean;
	validations?: FieldValidations;
	/** Options source for select/reference fields — emitted as element overrides. */
	datasource?: FieldDatasource;
	colSpan?: number;
	columnConfig?: IColumnConfig;
	uiComponentId?: number;
}

// ──────────────────────────────────────────────────────────────────
// Per-blueprint configs — the typed replacement for the untyped
// `archComponents.config` json column.
// ──────────────────────────────────────────────────────────────────

export interface IFormConfig extends IComponentIdentity {
	settings?: {
		validateOnBlur?: boolean;
		validateOnChange?: boolean;
		confirmOnLeave?: boolean;
	};
	/** Footer children (Button/Link components) — emitted into the "actions" slot. */
	actions?: AuthoringChild[];
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

/** MUI Typography — headings and text. */
export interface ITypographyConfig extends IComponentIdentity {
	text?: string;
	variant?:
		| "h1"
		| "h2"
		| "h3"
		| "h4"
		| "h5"
		| "h6"
		| "subtitle1"
		| "subtitle2"
		| "body1"
		| "body2"
		| "caption"
		| "overline"
		| "button";
	align?: "inherit" | "left" | "center" | "right" | "justify";
	color?: string;
	className?: string;
}

// ── Explicit layout primitives (MUI-aligned) ──────────────────────

export interface IGridConfig extends IComponentIdentity {
	/** true → MUI `<Grid container>`; false/omitted → a grid item. */
	container?: boolean;
	spacing?: number;
	/** MUI Grid only supports row directions — column layouts use Stack. */
	direction?: "row" | "row-reverse";
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
}

/**
 * The generic wrapper — MUI Box (a div with system props).
 * For anything that isn't Stack/Grid/Container, use Box.
 */
export interface IBoxConfig extends IComponentIdentity {
	display?:
		| "block"
		| "flex"
		| "grid"
		| "inline"
		| "inline-flex"
		| "inline-block"
		| "none";
	flexDirection?: "row" | "row-reverse" | "column" | "column-reverse";
	alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
	justifyContent?:
		| "flex-start"
		| "center"
		| "flex-end"
		| "space-between"
		| "space-around"
		| "space-evenly";
	gap?: number | string;
	padding?: number | string;
	margin?: number | string;
	width?: number | string;
	height?: number | string;
	maxWidth?: number | string;
	minWidth?: number | string;
	textAlign?: "left" | "center" | "right";
	bgcolor?: string;
	className?: string;
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

/** MUI Container — a max-width centered wrapper. */
export interface IContainerConfig extends IComponentIdentity {
	maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
	disableGutters?: boolean;
	className?: string;
}

/** MUI Paper — the rounded surface (replaces the renderer's hidden card). */
export interface IPaperConfig extends IComponentIdentity {
	elevation?: number;
	variant?: "elevation" | "outlined";
	square?: boolean;
	/** Convenience → sx `p` (default 2.5). */
	padding?: number | string;
	/** Convenience → sx `borderRadius` (default 2). */
	radius?: number | string;
	maxWidth?: number | string;
	/** Render children raw, without the surface. */
	fullBleed?: boolean;
}

/**
 * The default layout — a titled Paper card. Composes the Paper surface
 * with a title/description header (and an optional actions row), so
 * screens get a card look without hand-wrapping every widget in Paper.
 */
export interface ILayoutConfig extends IComponentIdentity {
	title?: string;
	description?: string;
	/** Paper surface options (see IPaperConfig). */
	elevation?: number;
	padding?: number | string;
	radius?: number | string;
	maxWidth?: number | string;
	fullBleed?: boolean;
}

// ── Buttons & links (full components, builder-addressable) ────────

export interface IButtonDialog {
	componentId: number;
	context?: string;
}

export interface IButtonCondition {
	field: string;
	operator: string;
	value?: unknown;
}

export interface IButtonConfirm {
	title?: string;
	message?: string;
}

export interface IButtonConfig extends IComponentIdentity {
	label: string;
	icon?: string;
	/** What the button does when clicked. */
	action?:
		| "submit"
		| "button"
		| "reset"
		| "close"
		| "openDialog"
		| "apiCall"
		| "navigate";
	variant?: "contained" | "outlined" | "text";
	color?: string;
	/** submit / apiCall: the request payload. */
	endpoint?: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	context?: string;
	successMessage?: string;
	successRedirect?: string;
	stateContext?: string;
	fieldMap?: Record<string, string>;
	/** openDialog: the dialog form component. */
	dialog?: IButtonDialog;
	/** navigate: the target path (supports {param} substitution). */
	path?: string;
	/** apiCall: confirmation dialog before firing. */
	confirm?: IButtonConfirm;
	/** Row-level visibility condition (table row actions). */
	condition?: IButtonCondition;
}

export interface ILinkConfig extends IComponentIdentity {
	label: string;
	path: string;
	icon?: string;
	variant?: "text" | "button";
}

// ── Table ─────────────────────────────────────────────────────────

export interface ITableOnRowClick {
	action: "openDialog" | "apiCall" | "navigate";
	/** openDialog: the dialog form component. */
	dialog?: { componentId: number; context?: string };
	/** apiCall: the request. */
	endpoint?: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	/** navigate: the target path (supports {id} substitution). */
	path?: string;
	confirm?: IButtonConfirm;
}

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
	/** Toolbar children (Button components) — emitted into the "toolbar" slot. */
	toolbar?: AuthoringChild[];
	/** Row-action children (Button components) — emitted into the "row-actions" slot. */
	rowActions?: AuthoringChild[];
	/** What happens when a row is clicked. */
	onRowClick?: ITableOnRowClick;
}

// ── Charts & metrics ────────────────────────────────────────────

/** Shared chart config — per-chart overridable paths live in the blueprint catalog. */
export interface IChartConfig extends IComponentIdentity {
	queryId?: string;
	parameters?: Record<string, unknown>;
	datasource?: {
		endpoint: string;
		method?: "GET" | "POST";
		params?: Record<string, unknown>;
	};
	dataMapping?: Record<string, unknown>;
	chartOptions?: Record<string, unknown>;
}

export interface IDateRangePickerConfig extends IComponentIdentity {
	startLabel?: string;
	endLabel?: string;
	minDate?: string;
	maxDate?: string;
	hideQuickSelectsTab?: boolean;
	hideDateRangeTab?: boolean;
	hideFavoriteTimeButton?: boolean;
}

// ── Uploads / assets ─────────────────────────────────────────────

export interface IAvatarConfig extends IComponentIdentity {
	datasource?: { endpoint: string; method?: "GET" | "POST" };
	uploadEndpoint?: string;
	removeEndpoint?: string;
	avatarField?: string;
}

export interface ILogoUploaderConfig extends IComponentIdentity {
	datasource?: { endpoint: string; method?: "GET" | "POST" };
	uploadEndpoint?: string;
	avatarField?: string;
	uploadFieldName?: string;
	shape?: "circle" | "square" | "rounded";
	removable?: boolean;
}

// ── Data viewers ─────────────────────────────────────────────────

export interface IRawJsonConfig extends IComponentIdentity {
	queryId?: string;
	parameters?: Record<string, unknown>;
}

export interface IAuditHistoryConfig extends IComponentIdentity {
	datasource?: { endpoint: string; method?: "GET" | "POST" };
}

export interface IListConfig extends IComponentIdentity {
	datasource?: {
		endpoint: string;
		method?: "GET" | "POST";
		params?: Record<string, unknown>;
	};
}

export interface IScreenTreeConfig extends IComponentIdentity {
	datasource?: { endpoint: string; method?: "GET" | "POST"; params?: Record<string, unknown> };
}

// ── State / actions ──────────────────────────────────────────────

export interface IStateContextConfig extends IComponentIdentity {
	name?: string;
}

export interface IStageActionsConfig extends IComponentIdentity {
	// presentation-only blueprint
}

// ── App-specific (host registers the renderers) ─────────────────

export interface ISwaggerEditorConfig extends IComponentIdentity {
	baseEndpoint?: string;
}

export interface ITestTabConfig extends IComponentIdentity {
	// presentation-only blueprint
}

export interface IPerMethodPricingConfig extends IComponentIdentity {
	// presentation-only blueprint
}
