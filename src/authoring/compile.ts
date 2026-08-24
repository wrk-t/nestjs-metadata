import type {
	archComponentElements as elSchema,
	archComponents as compSchema,
	fieldDefinitions as fdSchema,
	modules as mSchema,
	screens as scSchema,
} from "../schemas";
import type { FieldDefRow } from "./config-types";
import type { Screen } from "./nodes";

// ──────────────────────────────────────────────────────────────────
// SeedContext — the shared seed accumulator.
//
// ONE context per metadata seed suite (see back/…/seeds/metadata/index.ts):
// constructing a node inside a context registers its rows + edges; nodes
// constructed at import time (shared components/fields in their own files)
// are registered recursively when a parent or screen references them
// (`ensureIn`), or explicitly via `ensureNode` (components mounted only by
// id, e.g. dialog forms targeted from toolbarActions).
//
//   const seed = new SeedContext();          // becomes active
//   seed.ensureNode(loginForm);              // registers the whole subtree
//   seed.addModule({ ... });                 // module rows
//   seed.addScreen(new Screen({...}, root)); // screen rows
//   export const { COMPONENTS, ELEMENTS, ... } = seed.collect();
//
// Rows are deduped by id; element edge ids are minted from a
// process-global counter so aggregated bundles never mint colliding ids.
// ──────────────────────────────────────────────────────────────────

type CompRow = typeof compSchema.$inferInsert;
type ElRow = typeof elSchema.$inferInsert;
type ModuleRow = typeof mSchema.$inferInsert;
type ScreenRow = typeof scSchema.$inferInsert;

export interface SeedBundle {
	FIELD_DEFINITIONS: FieldDefRow[];
	COMPONENTS: CompRow[];
	ELEMENTS: ElRow[];
	MODULES: ModuleRow[];
	SCREENS: ScreenRow[];
}

// Global element-id sequence — shared by every SeedContext in the process
// so aggregated bundles never mint colliding ids. No row references an
// element id, so shifts across seed edits are safe.
let elementSeq = 0;

/** Reset the element-id sequence (tests only). */
export function resetElementIdSequence(): void {
	elementSeq = 0;
}

let activeContext: SeedContext | null = null;

export class SeedContext {
	readonly fieldDefinitions: FieldDefRow[] = [];
	readonly components: CompRow[] = [];
	readonly elements: ElRow[] = [];

	/** Module rows. */
	modules: ModuleRow[] = [];
	/** Screen rows. */
	screens: ScreenRow[] = [];

	private readonly seenFields = new Set<number>();
	private readonly seenComponents = new Set<number>();
	private readonly seenModules = new Set<number>();
	private readonly ensured = new Set<number>();

	constructor() {
		// Last-created context wins — seed files construct synchronously at
		// module top-level, one file at a time, so nodes always register
		// into the current file's context.
		activeContext = this;
	}

	/** The context newly-constructed nodes register into. */
	static get current(): SeedContext | null {
		return activeContext;
	}

	/** Register a field definition row — idempotent by id. */
	addFieldDefinition(row: FieldDefRow): void {
		if (row.id == null || this.seenFields.has(row.id)) return;
		this.seenFields.add(row.id);
		this.fieldDefinitions.push(row);
	}

	/** Register a component row — idempotent by id (first registration wins). */
	addComponent(row: CompRow): void {
		if (row.id == null || this.seenComponents.has(row.id)) return;
		this.seenComponents.add(row.id);
		this.components.push(row);
	}

	/** Register a module row — idempotent by id. */
	addModule(row: ModuleRow): void {
		if (row.id == null || this.seenModules.has(row.id)) return;
		this.seenModules.add(row.id);
		this.modules.push(row);
	}

	/** Whether a component's subtree has been ensured in this context. */
	hasEnsured(id: number): boolean {
		return this.ensured.has(id);
	}

	/** Mark a component's subtree as ensured in this context. */
	markEnsured(id: number): void {
		this.ensured.add(id);
	}

	/**
	 * Register a standalone node into this context — used for components
	 * mounted only by id (dialog forms targeted from toolbarActions) or
	 * shared fields that no parent mounts as a child.
	 */
	ensureNode(node: unknown): void {
		const n = node as {
			ensureIn?: (ctx: SeedContext) => void;
			fieldDefRow?: () => FieldDefRow;
		};
		if (typeof n?.ensureIn === "function") n.ensureIn(this);
		else if (typeof n?.fieldDefRow === "function") {
			this.addFieldDefinition(n.fieldDefRow());
		}
	}

	/**
	 * Pin a registered row's displayOrder to its slot position. The first
	 * parent wins; explicit `config.displayOrder` is never overwritten
	 * (rows carrying it register with that value, not the 0 sentinel).
	 */
	setDisplayOrder(id: number, order: number): void {
		const row = this.components.find((r) => r.id === id);
		if (row && row.displayOrder === 0) row.displayOrder = order;
	}

	addElement(row: ElRow): void {
		this.elements.push(row);
	}

	/**
	 * Register a screen row + its root component. The root node (or bare
	 * component id) is re-ensured idempotently, and the screen mounts it
	 * via `componentId`.
	 */
	addScreen(screen: Screen): void {
		const root = screen.root;
		if (typeof root !== "number") root.ensureIn(this);
		const rootId = typeof root === "number" ? root : root.id;
		this.screens.push({
			id: screen.config.id,
			moduleId: screen.config.moduleId,
			name: screen.config.name ?? String(screen.config.id),
			displayName: screen.config.displayName ?? "",
			icon: screen.config.icon ?? null,
			pathPattern: screen.config.pathPattern ?? null,
			visibleToPermissions: screen.config.visibleToPermissions ?? null,
			displayOrder: screen.config.displayOrder ?? 0,
			requiredTier: screen.config.requiredTier ?? null,
			requiresFeature: screen.config.requiresFeature ?? null,
			meta: screen.config.meta ?? null,
			componentId: rootId,
			isActive: true,
		});
	}

	nextElementId(): number {
		return ++elementSeq;
	}

	/**
	 * Finalize the bundle. Roots (rows never parented) get displayOrder 1;
	 * module/screens/widgets are normalized with the defaults hand-written
	 * seeds spell out. After collect() the context is detached.
	 */
	collect(): SeedBundle {
		for (const row of this.components) {
			if (row.displayOrder === 0) row.displayOrder = 1;
		}
		activeContext = null;
		return {
			FIELD_DEFINITIONS: this.fieldDefinitions,
			COMPONENTS: this.components,
			ELEMENTS: this.elements,
			MODULES: this.modules.map(normalizeModule),
			SCREENS: this.screens.map(normalizeScreen),
		};
	}
}

// ── Thin wrappers — fill the defaults the hand-written seeds spell out ──

function normalizeModule(module: ModuleRow): ModuleRow {
	return {
		tenantId: null,
		overridesModuleId: null,
		isActive: true,
		meta: null,
		...module,
	} as ModuleRow;
}

function normalizeScreen(screen: ScreenRow): ScreenRow {
	return {
		parentScreenId: null,
		tenantId: null,
		overridesScreenId: null,
		isActive: true,
		pathPattern: null,
		...screen,
	} as ScreenRow;
}
