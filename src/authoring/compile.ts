import type {
	archComponentElements as elSchema,
	archComponents as compSchema,
	fieldDefinitions as fdSchema,
	modules as mSchema,
	screens as scSchema,
	screenWidgets as swSchema,
} from "../schemas";
import type { AuthoringNode, IComponentIdentity } from "./nodes";
import { Component, Field, Ref, Renderer } from "./nodes";
import type { FieldDefRow } from "./config-types";

// ──────────────────────────────────────────────────────────────────
// defineSeed — walks the authored tree and emits the exact insert
// arrays seed.ts already consumes. No seed.ts change required.
// ──────────────────────────────────────────────────────────────────

type CompRow = typeof compSchema.$inferInsert;
type ElRow = typeof elSchema.$inferInsert;
type ModuleRow = typeof mSchema.$inferInsert;
type ScreenRow = typeof scSchema.$inferInsert;
type WidgetRow = typeof swSchema.$inferInsert;

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

export interface DefineSeedInput {
	fields?: FieldDefRow[];
	module?: ModuleRow;
	screens?: ScreenRow[];
	/** Main component tree roots. */
	components?: Component[];
	/** Dialog-mounted form roots (arch_components rows, seeded as FORM_COMPONENTS). */
	formComponents?: Component[];
	widgets?: WidgetRow[];
}

export interface SeedBundle {
	FIELD_DEFINITIONS: FieldDefRow[];
	COMPONENTS: CompRow[];
	FORM_COMPONENTS: CompRow[];
	ELEMENTS: ElRow[];
	MODULE: ModuleRow;
	SCREENS: ScreenRow[];
	SCREEN_WIDGETS: WidgetRow[];
}

interface EmitState {
	components: CompRow[];
	formComponents: CompRow[];
	elements: ElRow[];
}

function stripIdentity(config: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(config)) {
		if (!IDENTITY_KEYS.has(key)) out[key] = value;
	}
	return out;
}

function effectiveDisplayOrder(node: AuthoringNode, fallback: number): number {
	const configOrder = (
		node as { config?: { displayOrder?: number } }
	).config?.displayOrder;
	return node.displayOrder ?? configOrder ?? fallback;
}

function emitElement(
	state: EmitState,
	child: AuthoringNode,
	componentId: number,
	slotName: string,
	displayOrder: number,
): void {
	if (!child.elementId) {
		throw new Error(
			`Authoring: child in slot "${slotName}" of component "${componentId}" is missing .id(...) — every edge needs a static element id.`,
		);
	}

	const base = {
		id: child.elementId,
		componentId,
		slotName,
		displayOrder,
		isActive: true,
	};
	// Grid placement lives on the edge for every element type (css-grid slots).
	const edgeGrid = child.gridData ? { grid: child.gridData } : {};

	if (child instanceof Field) {
		const raw = child.overrides ?? {};
		const { uiComponentId } = raw as { uiComponentId?: number };
		const overrides: Record<string, unknown> = { ...raw };
		delete overrides.uiComponentId;

		const row: ElRow = {
			...base,
			...edgeGrid,
			elementType: "field",
			fieldDefinitionId: child.fieldDefinitionId,
			overrides: Object.keys(overrides).length > 0 ? overrides : null,
		};
		if (uiComponentId) row.uiComponentId = uiComponentId;
		state.elements.push(row);
		return;
	}

	if (child instanceof Ref) {
		state.elements.push({
			...base,
			...edgeGrid,
			elementType: "component_ref",
			referencedComponentId: child.componentId,
			paramBindings: child.paramBindings ?? {},
		});
		return;
	}

	if (child instanceof Component) {
		const row: ElRow = {
			...base,
			...edgeGrid,
			elementType: "component_ref",
			referencedComponentId: child.config.id,
			paramBindings: child.paramBindings ?? {},
		};
		state.elements.push(row);
		return;
	}

	if (child instanceof Renderer) {
		state.elements.push({
			...base,
			...edgeGrid,
			elementType: "renderer",
			rendererBlueprintId: child.rendererBlueprintId,
			rendererConfig: child.rendererConfig,
		});
		return;
	}

	throw new Error(`Authoring: unknown node kind in slot "${slotName}".`);
}

function emitComponent(
	state: EmitState,
	comp: Component,
	isFormRoot: boolean,
	slotDisplayOrder?: number,
): void {
	const identity = comp.config as IComponentIdentity;

	const row: CompRow = {
		id: identity.id,
		blueprintId: comp.blueprintId,
		name: identity.name ?? String(identity.id),
		displayName: identity.displayName ?? "",
		description: identity.description ?? null,
		icon: identity.icon ?? null,
		category: identity.category ?? "system",
		config: stripIdentity(comp.config as unknown as Record<string, unknown>),
		pathPattern: identity.pathPattern ?? null,
		visibleToPermissions: identity.visibleToPermissions ?? null,
		overridesComponentId: null,
		displayOrder:
			slotDisplayOrder ?? effectiveDisplayOrder(comp, isFormRoot ? 0 : 1),
		tenantId: null,
		isActive: true,
		isSystem: true,
		meta: identity.meta ?? null,
	};
	(isFormRoot ? state.formComponents : state.components).push(row);

	for (const [slotName, children] of Object.entries(comp.children)) {
		children.forEach((child, index) => {
			const displayOrder = effectiveDisplayOrder(child, index + 1);
			emitElement(state, child, comp.config.id, slotName, displayOrder);
			if (child instanceof Component) {
				emitComponent(state, child, isFormRoot, displayOrder);
			}
		});
	}
}

// ── Thin wrappers — fill the defaults the hand-written seeds spell out ──

function normalizeModule(module?: ModuleRow): ModuleRow {
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

export function defineSeed(input: DefineSeedInput): SeedBundle {
	const state: EmitState = { components: [], formComponents: [], elements: [] };

	for (const root of input.components ?? []) emitComponent(state, root, false);
	for (const root of input.formComponents ?? []) emitComponent(state, root, true);

	return {
		FIELD_DEFINITIONS: input.fields ?? [],
		COMPONENTS: state.components,
		FORM_COMPONENTS: state.formComponents,
		ELEMENTS: state.elements,
		MODULE: normalizeModule(input.module),
		SCREENS: (input.screens ?? []).map(normalizeScreen),
		SCREEN_WIDGETS: (input.widgets ?? []).map(normalizeWidget),
	};
}
