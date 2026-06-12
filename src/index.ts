// ── Schemas ────────────────────────────────────────────────
export * from "./schemas";

// ── Common DTOs ────────────────────────────────────────────
export {
  PublicTableDto,
  BasePagableQueryDto,
  PaginatedDto,
} from "./common/dto-base";

// ── Module types ───────────────────────────────────────────
export * from "./modules";

// ── Services ───────────────────────────────────────────────
export { FormsService } from "./services/forms.service";
export { EntitiesService } from "./services/entities.service";
export { FieldDefinitionsService } from "./services/field-definitions.service";
export { FormSectionsService } from "./services/form-sections.service";
export { FormElementsService } from "./services/form-elements.service";
export { TablesService } from "./services/tables.service";
export { TableColumnInstancesService } from "./services/table-column-instances.service";
export { UiComponentsService } from "./services/ui-components.service";
export { ScreensService } from "./services/screens.service";
export { ScreenWidgetsService } from "./services/screen-widgets.service";
export { ScreenContextsService } from "./services/screen-contexts.service";
export { WidgetContractsService } from "./services/widget-contracts.service";
export { ModulesService } from "./services/modules.service";
export { FeaturesService } from "./services/features.service";

// ── Repositories ───────────────────────────────────────────
export { FormsPgRepository } from "./repositories/forms.pg.repository";
export { EntitiesPgRepository } from "./repositories/entities.pg.repository";
export { FieldDefinitionsPgRepository } from "./repositories/field-definitions.pg.repository";
export { FormSectionsPgRepository } from "./repositories/form-sections.pg.repository";
export { FormElementsPgRepository } from "./repositories/form-elements.pg.repository";
export { TablesPgRepository } from "./repositories/tables.pg.repository";
export { TableColumnInstancesPgRepository } from "./repositories/table-column-instances.pg.repository";
export { UiComponentsPgRepository } from "./repositories/ui-components.pg.repository";
export { ScreensPgRepository } from "./repositories/screens.pg.repository";
export { ScreenWidgetsPgRepository } from "./repositories/screen-widgets.pg.repository";
export { ScreenContextsPgRepository } from "./repositories/screen-contexts.pg.repository";
export { WidgetContractsPgRepository } from "./repositories/widget-contracts.pg.repository";
export { ModulesPgRepository } from "./repositories/modules.pg.repository";
export { FeaturesPgRepository } from "./repositories/features.pg.repository";

// ── Module ────────────────────────────────────────────────
export { MetadataModule } from "./metadata.module";
export { METADATA_OPTIONS, TRANSLATION_SERVICE } from "./metadata.types";
export type { MetadataModuleOptions } from "./metadata.types";
