import type {
	archComponentElements as elSchema,
	archComponents as compSchema,
	fieldDefinitions as fdSchema,
	modules as mSchema,
	screens as scSchema,
	screenWidgets as swSchema,
} from "../schemas";
import type { FieldDefRow } from "./config-types";

// ──────────────────────────────────────────────────────────────────
// SeedContext — the per-file seed accumulator.
//
// Seeding is embedded in the node classes: constructing a node
// registers its rows into the ACTIVE context (see SeedContext.current).
// A seed file therefore needs no defineSeed ceremony:
//
//   const seed = new SeedContext();          // becomes active
//   const form = new Form({ id: 1 }, [...]); // registers rows + edges
//   seed.module = { ... }; seed.screens = [...]; seed.widgets = [...];
//   export const { COMPONENTS, ELEMENTS, ... } = seed.collect();
//
// Rows are deduped by id — the same instance reused in multiple parents
// emits its own rows once, with one edge per parent. Element edge ids
// are minted from a process-global counter so aggregated bundles
// (login + register + …) never mint colliding ids.
// ──────────────────────────────────────────────────────────────────

type CompRow = typeof compSchema.$inferInsert;
type ElRow = typeof elSchema.$inferInsert;
type ModuleRow = typeof mSchema.$inferInsert;
type ScreenRow = typeof scSchema.$inferInsert;
type WidgetRow = typeof swSchema.$inferInsert;

export interface SeedBundle {
	FIELD_DEFINITIONS: FieldDefRow[];
	COMPONENTS: CompRow[];
	ELEMENTS: ElRow[];
	MODULE?: ModuleRow;
	SCREENS: ScreenRow[];
	SCREEN_WIDGETS: WidgetRow[];
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

	/** Module row (optional — upserted by id). */
	module?: ModuleRow;
	/** Screen rows. */
	screens: ScreenRow[] = [];
	/** Widget rows. */
	widgets: WidgetRow[] = [];

	private readonly seenFields = new Set<number>();
	private readonly seenComponents = new Set<number>();

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
			MODULE: this.module ? normalizeModule(this.module) : undefined,
			SCREENS: this.screens.map(normalizeScreen),
			SCREEN_WIDGETS: this.widgets.map(normalizeWidget),
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

function normalizeWidget(widget: WidgetRow): WidgetRow {
	return {
		config: {},
		tenantId: null,
		overridesWidgetId: null,
		isActive: true,
		meta: null,
		...widget,
	} as WidgetRow;
}
