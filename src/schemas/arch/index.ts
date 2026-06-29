// ── Component architecture (v2) ──────────────────────────────
// These tables coexist with the old forms/tables/screens system.
// All tables use the "arch_" prefix to distinguish them while both
// systems are live. Once the old system is migrated, the prefix
// will be dropped.

export {
  archComponents,
  archComponentsRelations,
  type IBlueprintSlot,
  type IBlueprintContractParam,
  type IBlueprintContractOutput,
  type IBlueprintDef,
  type IPermissionVisibility,
} from "./components";

export {
  archComponentElements,
  archComponentElementsRelations,
  type IElementParamBinding,
  type IElementGrid,
} from "./componentElements";

export {
  archComponentOverrides,
  archComponentOverridesRelations,
} from "./componentOverrides";
