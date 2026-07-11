// ── Helpers (re-exported for consumer migrations) ──────────
export { ids } from "../helpers/ids";
export { timestamps } from "../helpers/timestamps";
export { fieldTypeEnum, scopeEnum } from "../helpers/enums";
export type { TFieldType, TScope } from "../helpers/enums";
export type { ISimpleCondition, ICompoundCondition } from "../types/conditions";

// ── Component architecture (v2) ────────────────────────────
export {
  archComponentBlueprints,
  archComponentBlueprintsRelations,
  archComponents,
  archComponentsRelations,
  archComponentElements,
  archComponentElementsRelations,
  archComponentOverrides,
  archComponentOverridesRelations,
} from "./arch";
export type {
  IBlueprintSlot,
  IBlueprintContractParam,
  IBlueprintContractOutput,
  IPermissionVisibility,
  IElementParamBinding,
  IElementGrid,
} from "./arch";

// ── Shared primitives ───────────────────────────────────────
export { entities } from "./entities";
export { features } from "./features";
export {
  fieldDefinitions,
  fieldDefinitionsRelations,
} from "./fieldDefinitions";
export { uiComponents } from "./uiComponents";

// ── Navigation (modules, screens, screen widgets) ───────────
export { modules, modulesRelations } from "./modules";
export { moduleItems, moduleItemsRelations } from "./moduleItems";
export { screens, screensRelations } from "./screens";
export { screenContexts, screenContextsRelations } from "./screenContexts";
export type { IScreenContextParam } from "./screenContexts";
export { screenWidgets, screenWidgetsRelations } from "./screenWidgets";
export type { IWidgetParamBinding } from "./screenWidgets";
