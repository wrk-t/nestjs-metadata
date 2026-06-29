// ── Helpers (re-exported for consumer migrations) ──────────
export { ids } from "../helpers/ids";
export { timestamps } from "../helpers/timestamps";
export { fieldTypeEnum, scopeEnum } from "../helpers/enums";
export type { TFieldType, TScope } from "../helpers/enums";
export type { ISimpleCondition, ICompoundCondition } from "../types/conditions";

// ── Component architecture (v2) ────────────────────────────
export {
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
  IBlueprintDef,
  IPermissionVisibility,
  IElementParamBinding,
  IElementGrid,
} from "./arch";

// ── Metadata schemas ────────────────────────────────────────
export { entities } from "./entities";
export { features } from "./features";
export {
  fieldDefinitions,
  fieldDefinitionsRelations,
} from "./fieldDefinitions";
export { fieldOverrides, fieldOverridesRelations } from "./fieldOverrides";
export { formElements, formElementsRelations } from "./formElements";
export { formOverrides, formOverridesRelations } from "./formOverrides";
export { formSections, formSectionsRelations } from "./formSections";
export { forms, formsRelations } from "./forms";
export { modules, modulesRelations } from "./modules";
export { moduleItems, moduleItemsRelations } from "./moduleItems";
export { screens, screensRelations } from "./screens";
export { screenContexts, screenContextsRelations } from "./screenContexts";
export type { IScreenContextParam } from "./screenContexts";
export { screenWidgets, screenWidgetsRelations } from "./screenWidgets";
export type { IWidgetParamBinding } from "./screenWidgets";
export {
  sectionOverrides,
  sectionOverridesRelations,
} from "./sectionOverrides";
export {
  tableColumnInstances,
  tableColumnInstancesRelations,
} from "./tableColumnInstances";
export { tables, tablesRelations } from "./tables";
export { uiComponents } from "./uiComponents";
export { widgetContracts, widgetContractsRelations } from "./widgetContracts";
export type { IWidgetParam, TParamSource } from "./widgetContracts";
export { PARAM_SOURCES } from "./widgetContracts";
