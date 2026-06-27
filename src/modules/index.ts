// ── Type-only exports for nestjs-metadata modules ──────────
// Each module exports SelectModel, InsertModel, and the schema.
// Import specific modules to avoid name collisions:
//   import { SelectModel as FormSelectModel } from "@wrk-t/nestjs-metadata/schemas";

// Re-export schemas only (no type collisions)
export { fieldDefinitions } from "./field-definitions/types";
export { features } from "./features/types";
export { uiComponents } from "./ui-components/types";
export { formElements } from "./form-elements/types";
export { formSections } from "./form-sections/types";
export { tableColumnInstances } from "./table-column-instances/types";
export { widgetContracts } from "./widget-contracts/types";
export { forms } from "./forms/types";
export { tables } from "./tables/types";
export { screens } from "./screens/types";
export { screenWidgets } from "./screen-widgets/types";
export { screenContexts } from "./screen-contexts/types";
export { modules } from "./modules-navigation/types";
