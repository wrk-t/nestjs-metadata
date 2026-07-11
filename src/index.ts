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
export { EntitiesService } from "./services/entities.service";
export { FieldDefinitionsService } from "./services/field-definitions.service";
export { UiComponentsService } from "./services/ui-components.service";
export { ScreensService } from "./services/screens.service";
export { ScreenWidgetsService } from "./services/screen-widgets.service";
export { ScreenContextsService } from "./services/screen-contexts.service";
export { ModulesService } from "./services/modules.service";
export { FeaturesService } from "./services/features.service";
export { ComponentsService } from "./services/components.service";

// ── Repositories ───────────────────────────────────────────
export { EntitiesPgRepository } from "./repositories/entities.pg.repository";
export { FieldDefinitionsPgRepository } from "./repositories/field-definitions.pg.repository";
export { UiComponentsPgRepository } from "./repositories/ui-components.pg.repository";
export { ScreensPgRepository } from "./repositories/screens.pg.repository";
export { ScreenWidgetsPgRepository } from "./repositories/screen-widgets.pg.repository";
export { ScreenContextsPgRepository } from "./repositories/screen-contexts.pg.repository";
export { ModulesPgRepository } from "./repositories/modules.pg.repository";
export { FeaturesPgRepository } from "./repositories/features.pg.repository";
export { ComponentsPgRepository } from "./repositories/components.pg.repository";

// ── Module ────────────────────────────────────────────────
export { MetadataModule } from "./metadata.module";
export { METADATA_OPTIONS, TRANSLATION_SERVICE } from "./metadata.types";
export type { MetadataModuleOptions } from "./metadata.types";
