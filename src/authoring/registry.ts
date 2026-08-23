import { DEFAULT_BLUEPRINTS } from "./blueprints";

// ──────────────────────────────────────────────────────────────────
// Blueprint id registry — the app binds its blueprint ids once via
// `registerBlueprintIds`. Component/Renderer classes resolve their
// blueprint id from here at construction time (`new` constructors have
// no factory wrapper to stamp ids).
// ──────────────────────────────────────────────────────────────────

let blueprintIdRegistry: Record<string, number> = {};

/**
 * Bind blueprint keys to the app's numeric blueprint ids. Must run
 * before any component is constructed — seed files import the app's
 * `_kit` (or equivalent) first.
 */
export function registerBlueprintIds(ids: Record<string, number>): void {
	blueprintIdRegistry = { ...blueprintIdRegistry, ...ids };
}

/** Resolve a blueprint key to its registered id, or throw. */
export function getBlueprintId(key: string): number {
	const id = blueprintIdRegistry[key];
	if (!id) {
		throw new Error(
			`Authoring: blueprint "${key}" has no registered id — call registerBlueprintIds({ ${key}: <id> }) before constructing nodes.`,
		);
	}
	return id;
}

/**
 * Stamp the package's blueprint catalog (DEFAULT_BLUEPRINTS) with the
 * app's ids → arch_component_blueprints rows. Throws if a catalog key
 * has no id, so the catalog and the registry can never drift.
 */
export function createBlueprintRows(idMap: Record<string, number>) {
	return DEFAULT_BLUEPRINTS.map((def) => {
		const id = idMap[def.key];
		if (!id) {
			throw new Error(
				`Authoring: catalog key "${def.key}" has no id in the blueprint registry.`,
			);
		}
		const { key: _key, ...rest } = def;
		return { id, ...rest };
	});
}
