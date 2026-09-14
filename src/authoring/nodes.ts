import type { IPermissionVisibility } from "../schemas";
import { SeedContext } from "./compile";
import type {
	FieldType,
	IAuditHistoryConfig,
	IAvatarConfig,
	IBoxConfig,
	IButtonConfig,
	IChartConfig,
	IContainerConfig,
	IDateRangePickerConfig,
	IFieldConfig,
	IFormConfig,
	IGridConfig,
	IInfoConfig,
	ILayoutConfig,
	ILinkConfig,
	IListConfig,
	ILogoUploaderConfig,
	IPaperConfig,
	IPerMethodPricingConfig,
	IRawJsonConfig,
	IScreenTreeConfig,
	IStackConfig,
	IStageActionsConfig,
	IStateContextConfig,
	ISwaggerEditorConfig,
	ITableConfig,
	ITabsConfig,
	ITestTabConfig,
	ITypographyConfig,
} from "./config-types";
import { getBlueprintId } from "./registry";

// ──────────────────────────────────────────────────────────────────
// Authoring node model — the tree the UI-builder will edit.
//
//   Component  → a blueprint instance (arch_components row) + children
//                filling its default slot (React-style: a single child,
//                an array, or nothing). Extra slots (e.g. Form `actions`)
//                are declared as node-typed config keys.
//   FieldNode  → a leaf field (TextField/PasswordField/…) that
//                self-provisions its field_definitions row + element.
//   Renderer   → a leaf renderer element (badge, chart-cell, …).
//   number     → a bare component id: embed an existing component by
//                reference (replaces `ref()`).
//
// Seeding is embedded in the classes: constructors register their rows
// into the active SeedContext; `SeedContext.collect()` finalizes the
// bundle (roots get displayOrder 1).
// ──────────────────────────────────────────────────────────────────

export type AuthoringChild = Component | FieldNode | Renderer | number;
export type Children = AuthoringChild | AuthoringChild[] | undefined;

export function normalizeChildren(children: Children): AuthoringChild[] {
	if (children == null) return [];
	return Array.isArray(children) ? children : [children];
}

export interface IComponentIdentity {
	/** Static id from the app registry (archComponents/… in cuid.ts). */
	id: number;
	name?: string;
	displayName?: string;
	description?: string;
	icon?: string;
	category?: string;
	pathPattern?: string | null;
	visibleToPermissions?: IPermissionVisibility[] | null;
	displayOrder?: number;
	meta?: Record<string, unknown> | null;
}

// ──────────────────────────────────────────────────────────────────
// AuthoringNode — marker base for everything that can appear as a child
// (Component, FieldNode, Renderer). Seeding is embedded in the node
// constructors — see Component/FieldNode.
// ──────────────────────────────────────────────────────────────────

export abstract class AuthoringNode {}

// ──────────────────────────────────────────────────────────────────
// Component — a blueprint instance with typed config + children
// ──────────────────────────────────────────────────────────────────

export abstract class Component<
	TCfg extends IComponentIdentity = IComponentIdentity,
> extends AuthoringNode {
	/** Blueprint registry key — bound to an app blueprint id. */
	static readonly blueprintKey: string;
	/** Slot filled by the children array. */
	static readonly defaultSlot: string = "content";
	/** Config keys that hold child nodes: config key → slot name. */
	static readonly nodeSlots: Record<string, string> = {};

	readonly config: TCfg;
	readonly children: AuthoringChild[];
	/** Blueprint id — resolved from the app registry at construction. */
	readonly blueprintId: number;

	constructor(config: TCfg, children?: Children) {
		super();
		this.config = config;
		this.children = normalizeChildren(children);
		this.blueprintId = getBlueprintId(
			(this.constructor as typeof Component).blueprintKey,
		);
		// ── Seed on construction: when a context is active, register the
		// whole subtree (recursive ensureIn). When no context is active
		// (e.g. shared components/fields constructed in their own files at
		// import time — the React-like seed layout), the subtree is
		// registered by whichever parent/screen references it.
		const ctx = SeedContext.current;
		if (ctx) this.ensureIn(ctx);
	}

	get id(): number {
		return this.config.id;
	}

	/**
	 * Register this component + its whole subtree into a context.
	 * Idempotent per context: a shared instance referenced by several
	 * parents registers its rows/edges exactly once; each parent still
	 * emits its own edge. Pins each child's displayOrder to its slot
	 * position (first parent wins).
	 */
	ensureIn(ctx: SeedContext): void {
		if (ctx.hasEnsured(this.id)) return;
		ctx.markEnsured(this.id);
		ctx.addComponent(this.seedRow());
		for (const [slot, child, index] of this.entries()) {
			const order = this.effectiveOrder(child, index + 1);
			this.emitEdge(ctx, slot, child, order);
			if (child instanceof Component) ctx.setDisplayOrder(child.id, order);
		}
	}

	/** (slot, child, index) pairs — default slot first, then node-slot config keys. */
	*entries(): Generator<[string, AuthoringChild, number]> {
		const ctor = this.constructor as typeof Component;
		for (let i = 0; i < this.children.length; i++) {
			yield [ctor.defaultSlot, this.children[i], i];
		}
		for (const [key, slot] of Object.entries(ctor.nodeSlots)) {
			const nodes = (this.config as unknown as Record<string, unknown>)[key];
			if (!Array.isArray(nodes)) continue;
			for (let i = 0; i < nodes.length; i++) {
				yield [slot, nodes[i] as AuthoringChild, i];
			}
		}
	}

	private effectiveOrder(
		nodeOrFallback: AuthoringNode | number,
		fallback: number,
	): number {
		if (typeof nodeOrFallback === "number") return fallback;
		const order = (nodeOrFallback as { config?: { displayOrder?: number } })
			.config?.displayOrder;
		return order ?? fallback;
	}

	/**
	 * The arch_components row — computed from config + blueprint id.
	 * displayOrder starts at the 0 sentinel: the parent pins it to the
	 * slot position when the edge is emitted; roots are finalized to 1
	 * in `SeedContext.collect()`. Explicit config.displayOrder wins.
	 */
	private seedRow() {
		const identity = this.config;
		return {
			id: identity.id,
			blueprintId: this.blueprintId,
			name: identity.name ?? String(identity.id),
			displayName: identity.displayName ?? "",
			description: identity.description ?? null,
			icon: identity.icon ?? null,
			category: identity.category ?? "system",
			config: this.strippedConfig(),
			pathPattern: identity.pathPattern ?? null,
			visibleToPermissions: identity.visibleToPermissions ?? null,
			overridesComponentId: null,
			displayOrder: identity.displayOrder ?? 0,
			tenantId: null,
			isActive: true,
			isSystem: true,
			meta: identity.meta ?? null,
		};
	}

	/** Config minus identity keys and node-typed slot keys (not JSON). */
	private strippedConfig(): Record<string, unknown> {
		const ctor = this.constructor as typeof Component;
		const nodeKeys = new Set(Object.keys(ctor.nodeSlots));
		const out: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(
			this.config as unknown as Record<string, unknown>,
		)) {
			if (IDENTITY_KEYS.has(key) || nodeKeys.has(key)) continue;
			out[key] = value;
		}
		return out;
	}

	private emitEdge(
		ctx: SeedContext,
		slot: string,
		child: AuthoringChild,
		displayOrder: number,
	): void {
		const base = {
			id: ctx.nextElementId(),
			componentId: this.id,
			slotName: slot,
			displayOrder,
			isActive: true,
		};

		if (typeof child === "number") {
			ctx.elements.push({
				...base,
				elementType: "component_ref",
				referencedComponentId: child,
				paramBindings: {},
			});
			return;
		}

		if (child instanceof Component) {
			// Ensure the whole subtree in THIS context (idempotent — also
			// covers shared instances constructed outside any seed context)
			// and pin its displayOrder to this slot (first parent wins).
			child.ensureIn(ctx);
			ctx.elements.push({
				...base,
				elementType: "component_ref",
				referencedComponentId: child.id,
				paramBindings: {},
			});
			return;
		}

		if (child instanceof FieldNode) {
			child.ensureIn(ctx);
			const overrides = child.elementOverrides();
			const row: (typeof ctx.elements)[number] = {
				...base,
				elementType: "field",
				fieldDefinitionId: child.id,
				overrides: Object.keys(overrides).length > 0 ? overrides : null,
			};
			if (child.config.uiComponentId != null) {
				row.uiComponentId = child.config.uiComponentId;
			}
			ctx.elements.push(row);
			return;
		}

		if (child instanceof Renderer) {
			ctx.elements.push({
				...base,
				elementType: "renderer",
				rendererBlueprintId: child.rendererBlueprintId,
				rendererConfig: child.rendererConfig,
			});
			return;
		}

		throw new Error(
			`Authoring: unknown child in slot "${slot}" of component "${this.id}".`,
		);
	}
}

/** Config keys that are component identity — lifted into columns, never stored in `config`. */
const IDENTITY_KEYS = new Set([
	"id",
	"name",
	"displayName",
	"description",
	"icon",
	"category",
	"pathPattern",
	"visibleToPermissions",
	"displayOrder",
	"meta",
]);

// ──────────────────────────────────────────────────────────────────
// Screen — a navigation screen that mounts a root component.
//
//   new Screen({ id, moduleId, name, ... }, rootComponent)
//
// Everything on a screen is a component; the screen simply points at
// its root (usually a Layout/Grid tree) via screens.componentId — the
// old screen_widgets indirection is gone. Register with
// `seed.addScreen(screen)`.
// ──────────────────────────────────────────────────────────────────

export interface IScreenIdentity {
	/** Static id from the app registry (screens/… in cuid.ts). */
	id: number;
	moduleId: number;
	name?: string;
	displayName?: string;
	icon?: string;
	pathPattern?: string | null;
	visibleToPermissions?: IPermissionVisibility[] | null;
	displayOrder?: number;
	/** Minimum tier to see this screen ("solo" | "team" | "enterprise"). */
	requiredTier?: string | null;
	/** Feature flag (features.name) that must be enabled for the tenant. */
	requiresFeature?: string | null;
	meta?: Record<string, unknown> | null;
}

export class Screen extends AuthoringNode {
	readonly config: IScreenIdentity;
	/** Root component the screen mounts — a node or a bare component id. */
	readonly root: Component | number;

	constructor(config: IScreenIdentity, root: Component | number) {
		super();
		this.config = config;
		this.root = root;
	}
}

// ── Concrete blueprint classes ────────────────────────────────────

export class Page extends Component<IComponentIdentity> {
	static readonly blueprintKey = "page";
	static readonly defaultSlot = "body";
}

export class Form extends Component<IFormConfig> {
	static readonly blueprintKey = "form";
	static readonly nodeSlots = { actions: "actions" };
}

export class Typography extends Component<ITypographyConfig> {
	static readonly blueprintKey = "typography";
}

export class Info extends Component<IInfoConfig> {
	static readonly blueprintKey = "info";
}

export class Tabs extends Component<ITabsConfig> {
	static readonly blueprintKey = "tabs";
}

export class Table extends Component<ITableConfig> {
	static readonly blueprintKey = "table";
	static readonly defaultSlot = "columns";
	static readonly nodeSlots = { toolbar: "toolbar", rowActions: "row-actions" };
}

/** Explicit layout primitive — `container: true` or an item with `sizes`. */
export class Grid extends Component<IGridConfig> {
	static readonly blueprintKey = "grid";
}

export class Stack extends Component<IStackConfig> {
	static readonly blueprintKey = "stack";
}

/** MUI Container — a max-width centered wrapper. */
export class Container extends Component<IContainerConfig> {
	static readonly blueprintKey = "container";
}

/** MUI Paper — the rounded surface (card). */
export class Paper extends Component<IPaperConfig> {
	static readonly blueprintKey = "paper";
}

/** MUI Box — the generic wrapper. */
export class Box extends Component<IBoxConfig> {
	static readonly blueprintKey = "box";
}

/** Default layout — a titled Paper card with an optional actions row. */
export class Layout extends Component<ILayoutConfig> {
	static readonly blueprintKey = "layout";
	static readonly nodeSlots = { actions: "actions" };
}

export class Button extends Component<IButtonConfig> {
	static readonly blueprintKey = "button";
}

export class Link extends Component<ILinkConfig> {
	static readonly blueprintKey = "link";
}

// ── Charts & metrics ──────────────────────────────────────────────

export class BarChart extends Component<IChartConfig> {
	static readonly blueprintKey = "barChart";
}

export class PieChart extends Component<IChartConfig> {
	static readonly blueprintKey = "pieChart";
}

export class LineChart extends Component<IChartConfig> {
	static readonly blueprintKey = "lineChart";
}

export class Metric extends Component<IChartConfig> {
	static readonly blueprintKey = "metric";
}

export class SpeedGauge extends Component<IChartConfig> {
	static readonly blueprintKey = "speedGauge";
}

export class DateRangePicker extends Component<IDateRangePickerConfig> {
	static readonly blueprintKey = "dateRangePicker";
}

// ── Uploads / assets ──────────────────────────────────────────────

export class Avatar extends Component<IAvatarConfig> {
	static readonly blueprintKey = "avatar";
}

export class LogoUploader extends Component<ILogoUploaderConfig> {
	static readonly blueprintKey = "logoUploader";
}

// ── Data viewers ──────────────────────────────────────────────────

export class RawJson extends Component<IRawJsonConfig> {
	static readonly blueprintKey = "rawJson";
}

export class AuditHistory extends Component<IAuditHistoryConfig> {
	static readonly blueprintKey = "auditHistory";
}

export class List extends Component<IListConfig> {
	static readonly blueprintKey = "list";
}

export class ScreenTree extends Component<IScreenTreeConfig> {
	static readonly blueprintKey = "screenTree";
}

// ── State / actions ───────────────────────────────────────────────

export class StateContext extends Component<IStateContextConfig> {
	static readonly blueprintKey = "stateContext";
}

export class StageActions extends Component<IStageActionsConfig> {
	static readonly blueprintKey = "stageActions";
}

// ── App-specific (the host registers their renderers) ─────────────

export class SwaggerEditor extends Component<ISwaggerEditorConfig> {
	static readonly blueprintKey = "swaggerEditor";
}

export class TestTab extends Component<ITestTabConfig> {
	static readonly blueprintKey = "testTab";
}

export class PerMethodPricing extends Component<IPerMethodPricingConfig> {
	static readonly blueprintKey = "perMethodPricing";
}

// ──────────────────────────────────────────────────────────────────
// FieldNode — a leaf field that self-provisions its field definition
// ──────────────────────────────────────────────────────────────────

export abstract class FieldNode extends AuthoringNode {
	/** field_definitions.type */
	static readonly fieldType: FieldType;

	readonly config: IFieldConfig;

	constructor(config: IFieldConfig) {
		super();
		this.config = config;
		// Seed on construction: register the field definition row when a
		// context is active. Otherwise the parent's ensureIn registers it.
		SeedContext.current?.addFieldDefinition(this.fieldDefRow());
	}

	get id(): number {
		return this.config.id;
	}

	/** Register the field definition row (idempotent by id). */
	ensureIn(ctx: SeedContext): void {
		ctx.addFieldDefinition(this.fieldDefRow());
	}

	/** Instance-specific element overrides (renderer-facing). */
	elementOverrides(): Record<string, unknown> {
		// Passthrough first — explicit DSL keys below win when they overlap.
		const out: Record<string, unknown> = { ...(this.config.overrides ?? {}) };
		const cfg = this.config;
		if (cfg.label != null || cfg.displayName != null) {
			out.displayName = cfg.displayName ?? cfg.label;
		}
		if (cfg.columnName != null) out.name = cfg.columnName;
		if (cfg.defaultValue !== undefined) out.defaultValue = cfg.defaultValue;
		if (cfg.description != null) out.description = cfg.description;
		if (cfg.isRequired != null) out.isRequired = cfg.isRequired;
		if (cfg.isReadOnly != null) out.isReadOnly = cfg.isReadOnly;
		if (cfg.readOnlyWhen != null) out.readOnlyWhen = cfg.readOnlyWhen;
		if (cfg.visibleWhen != null) out.visibleWhen = cfg.visibleWhen;
		if (cfg.requiresFeature != null) out.requiresFeature = cfg.requiresFeature;
		if (cfg.isHidden != null) out.hidden = cfg.isHidden;
		if (cfg.placeholder != null) out.placeholder = cfg.placeholder;
		if (cfg.validations != null) out.validations = cfg.validations;
		if (cfg.datasource != null) out.datasource = cfg.datasource;
		if (cfg.colSpan != null) out.colSpan = cfg.colSpan;
		if (cfg.columnConfig != null) out.columnConfig = cfg.columnConfig;
		if (cfg.visibleToPermissions != null) {
			out.visibleToPermissions = cfg.visibleToPermissions;
		}
		return out;
	}

	/** The field_definitions row — deduped by id in the seed context. */
	fieldDefRow() {
		return {
			id: this.config.id,
			name: this.config.name ?? String(this.config.id),
			displayName: this.config.displayName ?? this.config.label ?? "",
			type: (this.constructor as typeof FieldNode).fieldType,
			isSystem: true,
			isActive: true,
		};
	}
}

export class TextField extends FieldNode {
	static readonly fieldType = "text";
}

export class AutocompleteField extends FieldNode {
	static readonly fieldType = "autocomplete";
}

export class PasswordField extends FieldNode {
	static readonly fieldType = "password";
}

export class NumberField extends FieldNode {
	static readonly fieldType = "number";
}

export class EmailField extends FieldNode {
	static readonly fieldType = "email";
}

export class TextareaField extends FieldNode {
	static readonly fieldType = "textarea";
}

export class SelectField extends FieldNode {
	static readonly fieldType = "select";
}

export class MultiselectField extends FieldNode {
	static readonly fieldType = "multiselect";
}

export class RadioField extends FieldNode {
	static readonly fieldType = "radio";
}

export class CheckboxField extends FieldNode {
	static readonly fieldType = "checkbox";
}

export class SwitchField extends FieldNode {
	static readonly fieldType = "switch";
}

export class DateField extends FieldNode {
	static readonly fieldType = "date";
}

export class DateTimeField extends FieldNode {
	static readonly fieldType = "datetime";
}

export class TimeField extends FieldNode {
	static readonly fieldType = "time";
}

export class BooleanField extends FieldNode {
	static readonly fieldType = "boolean";
}

export class ColorField extends FieldNode {
	static readonly fieldType = "color";
}

export class JsonField extends FieldNode {
	static readonly fieldType = "json";
}

// ──────────────────────────────────────────────────────────────────
// Renderer — a leaf renderer element (no own rows; the parent emits
// the edge referencing the renderer blueprint)
// ──────────────────────────────────────────────────────────────────

export abstract class Renderer extends AuthoringNode {
	static readonly blueprintKey: string;

	readonly rendererBlueprintId: number;
	readonly rendererConfig: Record<string, unknown>;

	constructor(config: Record<string, unknown> = {}) {
		super();
		this.rendererConfig = config;
		this.rendererBlueprintId = getBlueprintId(
			(this.constructor as typeof Renderer).blueprintKey,
		);
	}
}

export class Badge extends Renderer {
	static readonly blueprintKey = "badge";
}

export class ActionButton extends Renderer {
	static readonly blueprintKey = "actionButton";
}

export class ChartCell extends Renderer {
	static readonly blueprintKey = "chartCell";
}

export class FieldRenderer extends Renderer {
	static readonly blueprintKey = "fieldRenderer";
}
