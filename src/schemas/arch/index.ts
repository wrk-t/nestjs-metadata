// ── Component architecture (v2) ──────────────────────────────
//
// Three tables that replace forms/tables/screens/screen_widgets
// with a unified component model:
//
//   arch_component_blueprints  — "class": slots, overridable, contract
//   arch_components            — "instance": concrete config, elements,
//                                + tenant-scoped deltas (baseComponentId
//                                + editOps)
//   arch_component_elements    — children filling blueprint slots
//
// Components are the customization point: a tenant-scoped delta row
// (baseComponentId + editOps) customizes a base component; the merged
// tree is computed at read time. The arch_component_overrides table is
// gone.
//
// These coexist with the old system (forms, tables, screens, etc.).
// All tables use the "arch_" prefix while both systems are live.

export {
  archComponentBlueprints,
  archComponentBlueprintsRelations,
  type IBlueprintSlot,
  type IBlueprintContractParam,
  type IBlueprintContractOutput,
} from "./componentBlueprints";

export {
  archComponents,
  archComponentsRelations,
  type IPermissionVisibility,
  type IEditOp,
  type TEditOperation,
} from "./components";

export {
  archComponentElements,
  archComponentElementsRelations,
  type IElementParamBinding,
  type IElementGrid,
} from "./componentElements";
