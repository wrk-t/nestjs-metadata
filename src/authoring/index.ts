// ──────────────────────────────────────────────────────────────────
// @wrk-t/nestjs-metadata/authoring — public surface.
//
// Kept OUT of the main src/index.ts barrel so authoring code is never
// pulled into the runtime bundle. Imported only by seed files.
// ──────────────────────────────────────────────────────────────────

export { createAuthoringKit } from "./kit";
export type { AuthoringKit, BlueprintIdMap } from "./kit";
export { defineSeed } from "./compile";
export type { DefineSeedInput, SeedBundle } from "./compile";
export { defineField } from "./config-types";
export { DEFAULT_BLUEPRINTS } from "./blueprints";
export type { IBlueprintDefinition, TBlueprintKey } from "./blueprints";
export {
	ActionButton,
	AuthoringNode,
	Badge,
	ChartCell,
	Component,
	Container,
	Field,
	FieldRenderer,
	Form,
	Grid,
	Info,
	Page,
	ref,
	Ref,
	Renderer,
	ScreenLayout,
	Section,
	Stack,
	Table,
	Tabs,
} from "./nodes";
export type { IComponentIdentity, NodeKind, SlotChildren } from "./nodes";
export type {
	FieldDatasource,
	FieldDefRow,
	FieldType,
	FieldValidations,
	IApiCallAction,
	IColumnConfig,
	IContainerConfig,
	IFieldOverride,
	IFormActionApiCall,
	IFormConfig,
	IGridConfig,
	IInfoConfig,
	IOpenDialogAction,
	ISectionConfig,
	IStackConfig,
	ITableAction,
	ITableActionBase,
	ITableConfig,
	ITabsConfig,
} from "./config-types";
