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
	/**
	 * Option source for select filters — a static list or an API endpoint
	 * (e.g. DB-defined enums like tiers, which can't be hard-coded).
	 * The DynamicTable fetches service options and renders them as the
	 * filter dropdown.
	 */
	filterOptions?: {
		type: "static" | "service";
		/** static: the option list (labels support $trl_ keys). */
		options?: Array<{ label: string; value: string }>;
		/** service: fetch options from this endpoint. */
		endpoint?: string;
		/** service: row field used as the option label (default "displayName"). */
		labelField?: string;
		/** service: row field used as the option value (default "id"). */
		valueField?: string;
	};
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
		/** Make the field read-only in specific dialog contexts (e.g. edit). */
		readOnlyWhen?: { context?: string[] };
		/** Show the field only in specific dialog contexts (e.g. create). */
		visibleWhen?: { context?: string[] };
		validations?: FieldValidations;
		/** Options source for select/reference fields — emitted as element overrides. */
		datasource?: FieldDatasource;
		colSpan?: number;
		columnConfig?: IColumnConfig;
		/**
		 * Element-level column accessor — the element's `name`, overriding the
		 * field-def name when they differ (e.g. a tenant column whose accessor
		 * is "tenant.displayName" while the field-def is named "tenantName").
		 */
		columnName?: string;
		/**
		 * Feature flag (features.name) — the field is hidden unless the flag is
		 * enabled for the current tenant (e.g. MI selection on the service form).
		 */
		requiresFeature?: string;
		uiComponentId?: number;
	}

// ──────────────────────────────────────────────────────────────────
// Per-blueprint configs — the typed replacement for the untyped
// `archComponents.config` json column.
// ──────────────────────────────────────────────────────────────────

export interface IFormSubmitConfig {
	/** The endpoint the form submits to (supports {id} substitution). */
	endpoint: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	/** create | edit — drives record fetch + payload shape. */
	context?: "create" | "edit";
	successMessage?: string;
	successRedirect?: string;
	/** Resolve the payload from a state context instead of the form values. */
	stateContext?: string;
	/** Rename payload keys before sending (e.g. tenantId → ownerTenantId). */
	fieldMap?: Record<string, string>;
}

export interface IFormConfig extends IComponentIdentity {
	settings?: {
		validateOnBlur?: boolean;
		validateOnChange?: boolean;
		confirmOnLeave?: boolean;
	};
	/**
	 * Submission config — lives on the FORM, not on the submit button.
	 * A submit button is just a Button with action: "submit".
	 */
	submit?: IFormSubmitConfig;
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
	/** Vertical gap between content children (MUI Stack spacing). */
	spacing?: number;
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
	/**
	 * Feature flag (features.name) — the button is hidden unless the flag
	 * is enabled for the current tenant (e.g. the create-version action
	 * behind "service_versioning").
	 */
	requiresFeature?: string;
	/**
	 * Static request body for apiCall actions — overrides the default
	 * (whole-row) payload (e.g. stage transitions: { stage: "published" }).
	 */
	body?: Record<string, unknown>;
	/** submit / apiCall: the request payload. (For submit buttons this lives
	 *  on the FORM — IFormConfig.submit; the button only declares the action.) */
	endpoint?: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	context?: string;
	successMessage?: string;
	successRedirect?: string;
	/** apiCall (table actions): what happens after success. Defaults to
	 *  "refreshTable" (or "navigate" when successRedirect is set).
	 *  "refreshAll" revalidates every SWR key — e.g. toggling a tenant
	 *  feature must refresh the feature flags consumed by useFeatures. */
	onSuccess?: "refreshTable" | "refreshAll" | "closeDialog" | "navigate";
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
	action?: "openDialog" | "apiCall" | "navigate";
	/** openDialog: the dialog form component. */
	dialog?: { componentId: number; context?: string };
	/** apiCall: the request. */
	endpoint?: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	/** navigate: the target path (supports {id} substitution). */
	path?: string;
	confirm?: IButtonConfirm;
	/**
	 * Legacy direct-redirect format: a path template (supports {id} and
	 * nested placeholders like {serviceVersions[0].id}).
	 */
	redirect?: string;
	/**
	 * Feature-gated navigation: when this feature flag is OFF for the tenant,
	 * `fallbackRedirect` is used instead of `redirect` (e.g. a single-version
	 * workspace jumps straight to the version's operations).
	 */
	fallbackFeature?: string;
	fallbackRedirect?: string;
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
	/** Row selection (e.g. the available-operations picker in the link-ops
	 *  dialog) — enables MRT's checkbox column and feeds selection actions. */
	selection?: {
		enabled?: boolean;
		actions?: AuthoringChild[];
	};
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
		type?: "rest";
		endpoint: string;
		method?: "GET" | "POST";
		params?: Record<string, unknown>;
	};
	/** Card rendering settings (consumed by ListRenderer). */
	settings?: {
		showTypeBadge?: boolean;
		valueField?: string;
		emptyMessage?: string;
		/** Open the first openDialog row action when a card is clicked. */
		openDialogOnCardClick?: boolean;
	};
	/** Toolbar actions (TableAction-shaped — consumed by ListRenderer). */
	toolbarActions?: unknown[];
	/** Row actions (TableAction-shaped — consumed by ListRenderer). */
	rowActions?: unknown[];
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
