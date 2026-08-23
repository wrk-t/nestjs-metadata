import type {
	IElementGrid,
	IElementParamBinding,
	IPermissionVisibility,
} from "../schemas";
import type {
	IContainerConfig,
	IFormConfig,
	IGridConfig,
	IInfoConfig,
	ISectionConfig,
	IStackConfig,
	ITableConfig,
	ITabsConfig,
	IFieldOverride,
} from "./config-types";

// ──────────────────────────────────────────────────────────────────
// Authoring node model — the tree the UI-builder will edit.
//
//   Component → a blueprint instance (arch_components row) + children
//   Field     → a field element (edge, no component row)
//   Renderer  → a leaf renderer element (edge, rendererBlueprintId)
//   Ref       → embed an existing component by id (edge, component_ref)
//
// Edge-level presentation lives on the node (chains return `this`),
// so the tree reads top-down exactly as it renders.
// ──────────────────────────────────────────────────────────────────

export type SlotChildren = Record<string, AuthoringNode[]>;

export type NodeKind = "component" | "field" | "renderer" | "ref";

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

export abstract class AuthoringNode {
	abstract readonly kind: NodeKind;

	/** Static element id (arch_component_elements.id) — required on every child. */
	elementId?: number;
	displayOrder?: number;
	/** Legacy edge-level grid placement (css-grid slots). Backing field for `.grid()`. */
	gridData?: IElementGrid;
	paramBindings?: Record<string, IElementParamBinding>;
	overrides?: Record<string, unknown>;

	/** Pins the edge row id. */
	id(elementId: number): this {
		this.elementId = elementId;
		return this;
	}

	/** Explicit edge displayOrder (defaults to the slot index). */
	order(n: number): this {
		this.displayOrder = n;
		return this;
	}

	/** Grid placement for css-grid slots (legacy — layout nodes replace this). */
	grid(g: IElementGrid): this {
		this.gridData = g;
		return this;
	}

	/** Resolve the child's contract inputs from context. */
	bind(b: Record<string, IElementParamBinding>): this {
		this.paramBindings = { ...this.paramBindings, ...b };
		return this;
	}

	/** Element-level overrides merged into the edge row. */
	override(o: Record<string, unknown>): this {
		this.overrides = { ...this.overrides, ...o };
		return this;
	}
}

// ──────────────────────────────────────────────────────────────────
// Component — a blueprint instance with typed config + slot children
// ──────────────────────────────────────────────────────────────────

export abstract class Component<
	TCfg extends IComponentIdentity = IComponentIdentity,
> extends AuthoringNode {
	readonly kind = "component" as const;

	/** Blueprint registry key — bound to an app blueprint id by the kit. */
	static readonly blueprintKey: string;

	/** Blueprint id — stamped by the kit binding at construction. */
	blueprintId!: number;

	readonly config: TCfg;
	readonly children: SlotChildren;

	constructor(config: TCfg, children: SlotChildren = {}) {
		super();
		this.config = config;
		this.children = children;
	}
}

// ── Concrete blueprint classes ────────────────────────────────────

export class ScreenLayout extends Component<IComponentIdentity> {
	static readonly blueprintKey = "screenLayoutGeneral";
	constructor(config: IComponentIdentity, children: SlotChildren = {}) {
		super(config, children);
	}
}

export class Page extends Component<IComponentIdentity> {
	static readonly blueprintKey = "page";
	constructor(config: IComponentIdentity, children: SlotChildren = {}) {
		super(config, children);
	}
}

export class Form extends Component<IFormConfig> {
	static readonly blueprintKey = "form";
	constructor(config: IFormConfig, children: SlotChildren = {}) {
		super(config, children);
	}
}

export class Section extends Component<ISectionConfig> {
	static readonly blueprintKey = "section";
	constructor(config: ISectionConfig, children: SlotChildren = {}) {
		super(config, children);
	}
}

export class Info extends Component<IInfoConfig> {
	static readonly blueprintKey = "info";
	constructor(config: IInfoConfig, children: SlotChildren = {}) {
		super(config, children);
	}
}

export class Tabs extends Component<ITabsConfig> {
	static readonly blueprintKey = "tabs";
	constructor(config: ITabsConfig, children: SlotChildren = {}) {
		super(config, children);
	}
}

export class Table extends Component<ITableConfig> {
	static readonly blueprintKey = "table";
	constructor(config: ITableConfig, children: SlotChildren = {}) {
		super(config, children);
	}
}

/** Explicit layout primitive — `container: true` or an item with `sizes`. */
export class Grid extends Component<IGridConfig> {
	static readonly blueprintKey = "grid";
	constructor(config: IGridConfig, children: SlotChildren = {}) {
		super(config, children);
	}
}

export class Stack extends Component<IStackConfig> {
	static readonly blueprintKey = "stack";
	constructor(config: IStackConfig, children: SlotChildren = {}) {
		super(config, children);
	}
}

/** The card wrapper — replaces the renderer's hidden BodyCard. */
export class Container extends Component<IContainerConfig> {
	static readonly blueprintKey = "container";
	constructor(config: IContainerConfig, children: SlotChildren = {}) {
		super(config, children);
	}
}

// ──────────────────────────────────────────────────────────────────
// Leaf nodes
// ──────────────────────────────────────────────────────────────────

export class Field extends AuthoringNode {
	readonly kind = "field" as const;

	constructor(
		readonly fieldDefinitionId: number,
		overrides: IFieldOverride = {},
	) {
		super();
		this.overrides = { ...(overrides as Record<string, unknown>) };
	}
}

export abstract class Renderer extends AuthoringNode {
	readonly kind = "renderer" as const;

	static readonly blueprintKey: string;

	/** Renderer blueprint id — stamped by the kit binding. */
	rendererBlueprintId!: number;

	readonly rendererConfig: Record<string, unknown>;

	constructor(config: Record<string, unknown> = {}) {
		super();
		this.rendererConfig = config;
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

export class Ref extends AuthoringNode {
	readonly kind = "ref" as const;

	constructor(readonly componentId: number) {
		super();
	}
}

/** Embed an existing component (defined in another file) by id. */
export function ref(componentId: number): Ref {
	return new Ref(componentId);
}
