// ──────────────────────────────────────────────────────────────────
// Delta merge engine — applies a component's editOps (the delta) onto
// its base component at read time.
//
// Pure functions, no I/O. The service layer loads the base rows and the
// delta (arch_components.baseComponentId + editOps) and calls
// `mergeDelta` to produce the merged component the renderer sees:
//
//   merge → deep-merge (user wins on exactly the paths they touched)
//   replace → overwrite
//   append/prepend/insert → created nodes carry explicit ids (stable
//     across re-merges)
//   remove → drop the element
//
// Ops are applied in order; ops targeting elements the base no longer
// has are silent no-ops. Slots are renumbered 1..n by final position.
// ──────────────────────────────────────────────────────────────────
import type { IEditOp } from "../schemas/arch/components";

/** Element row the merge operates on (row minus componentId). */
export type DeltaElement = Record<string, unknown> & {
	id: number;
	slotName: string;
	elementType: string;
	displayOrder: number;
};

export interface IDeltaSource {
	/** Component row identity columns (displayName, description, icon, …). */
	identity: Record<string, unknown>;
	config: Record<string, unknown>;
	elements: DeltaElement[];
}

export interface IDeltaResult {
	identity: Record<string, unknown>;
	config: Record<string, unknown>;
	elements: DeltaElement[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge(base: unknown, override: unknown): unknown {
	if (isPlainObject(base) && isPlainObject(override)) {
		const out: Record<string, unknown> = { ...base };
		for (const [k, v] of Object.entries(override)) {
			out[k] = k in out ? deepMerge(out[k], v) : v;
		}
		return out;
	}
	return override === undefined ? base : override;
}

function getPath(obj: unknown, path: string): unknown {
	if (obj == null) return undefined;
	return path.split(".").reduce<unknown>(
		(o, k) => (isPlainObject(o) ? o[k] : undefined),
		obj,
	);
}

function setPath(
	root: Record<string, unknown>,
	path: string,
	value: unknown,
): void {
	const parts = path.split(".");
	let cur = root;
	for (let i = 0; i < parts.length - 1; i++) {
		const k = parts[i];
		const next = cur[k];
		if (!isPlainObject(next)) cur[k] = {};
		cur = cur[k] as Record<string, unknown>;
	}
	cur[parts[parts.length - 1]] = value;
}

/** Element fields a merge/replace op may touch (identity keys stay put). */
const ELEMENT_IMMUTABLE = new Set(["id", "slotName", "componentId"]);

function mergeInto(el: DeltaElement, value: unknown): void {
	for (const [k, v] of Object.entries(value ?? {})) {
		if (ELEMENT_IMMUTABLE.has(k)) continue;
		el[k] = k in el ? deepMerge(el[k], v) : v;
	}
}

function replaceInto(el: DeltaElement, value: unknown): void {
	for (const [k, v] of Object.entries(value ?? {})) {
		if (ELEMENT_IMMUTABLE.has(k)) continue;
		el[k] = v;
	}
}

/** Provisional displayOrder so created nodes sort into the right place. */
function provisionalOrder(
	list: DeltaElement[],
	op: IEditOp,
	node: DeltaElement,
): number {
	const anchor = (op.value as { after?: number; before?: number } | undefined) ??
		{};
	const last = list.length > 0 ? list[list.length - 1].displayOrder : 0;
	const first = list.length > 0 ? list[0].displayOrder : 0;
	if (op.operation === "prepend") return first - 1000;
	if (op.operation === "insert" && anchor.after != null) {
		const i = list.findIndex((e) => e.id === anchor.after);
		if (i >= 0) {
			const after = list[i].displayOrder;
			const next = list[i + 1]?.displayOrder;
			return next != null ? (after + next) / 2 : after + 1000;
		}
	}
	if (op.operation === "insert" && anchor.before != null) {
		const i = list.findIndex((e) => e.id === anchor.before);
		if (i >= 0) {
			const before = list[i].displayOrder;
			const prev = list[i - 1]?.displayOrder;
			return prev != null ? (prev + before) / 2 : before - 1000;
		}
	}
	// append (or insert with an unknown anchor → fall through to end)
	node.displayOrder = last + 1000;
	return last + 1000;
}

/**
 * Apply a component's editOps onto its base.
 *
 * Returns NEW identity/config/element objects — the source is never
 * mutated. Elements are renumbered per slot (1..n, by position after
 * the ops), so ordering is always contiguous and stable.
 */
export function mergeDelta(source: IDeltaSource, ops: IEditOp[]): IDeltaResult {
	const identity = { ...source.identity };
	const config = structuredClone(source.config ?? {});
	const slots = new Map<string, DeltaElement[]>();
	for (const el of structuredClone(source.elements) as DeltaElement[]) {
		const list = slots.get(el.slotName);
		if (list) list.push(el);
		else slots.set(el.slotName, [el]);
	}

	for (const op of ops) {
		const sel = op.selector;
		if (sel.kind === "identity") {
			if (op.operation === "merge" || op.operation === "replace") {
				const merged =
					op.operation === "merge"
						? deepMerge(getPath(identity, sel.path), op.value)
						: op.value;
				setPath(identity, sel.path, merged);
			}
			continue;
		}
		if (sel.kind === "config") {
			if (op.operation === "merge" || op.operation === "replace") {
				const merged =
					op.operation === "merge"
						? deepMerge(getPath(config, sel.path), op.value)
						: op.value;
				setPath(config, sel.path, merged);
			}
			continue;
		}
		if (sel.kind === "element") {
			const list = [...slots.values()].find((l) =>
				l.some((e) => e.id === sel.elementId),
			);
			const el = list?.find((e) => e.id === sel.elementId);
			if (!el || !list) continue; // base removed it — user op is a no-op
			if (op.operation === "remove") {
				list.splice(list.indexOf(el), 1);
			} else if (op.operation === "merge") {
				mergeInto(el, op.value);
			} else if (op.operation === "replace") {
				replaceInto(el, op.value);
			}
			continue;
		}
		// sel.kind === "slot"
		if (op.operation === "remove") continue; // whole-slot removal: unsupported for now
		const node = op.node as DeltaElement | undefined;
		if (!node || node.id == null) continue;
		const list = slots.get(sel.slotName) ?? [];
		if (!slots.has(sel.slotName)) slots.set(sel.slotName, list);
		const order = provisionalOrder(list, op, node);
		node.displayOrder = order;
		if (op.operation === "prepend") {
			list.unshift(node);
		} else if (op.operation === "insert") {
			const anchor = (op.value as { after?: number; before?: number } | undefined) ??
				{};
			const after = anchor.after != null ? list.findIndex((e) => e.id === anchor.after) : -1;
			if (anchor.after != null && after >= 0) {
				list.splice(after + 1, 0, node);
			} else {
				const before = anchor.before != null ? list.findIndex((e) => e.id === anchor.before) : -1;
				if (anchor.before != null && before >= 0) list.splice(before, 0, node);
				else list.push(node);
			}
		} else {
			// append (default)
			list.push(node);
		}
	}

	// Finalize: per-slot sort by provisional order, renumber 1..n
	const elements: DeltaElement[] = [];
	for (const [name, list] of slots) {
		const sorted = [...list].sort(
			(a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
		);
		sorted.forEach((el, i) => {
			el.slotName = name;
			el.displayOrder = i + 1;
			elements.push(el);
		});
	}

	return { identity, config, elements };
}
