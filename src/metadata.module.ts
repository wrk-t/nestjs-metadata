import { DynamicModule, Module } from "@nestjs/common";
import {
  RequestContext,
  AccessControlService,
} from "@esmaeel_emadi/nestjs-core";
import {
  METADATA_OPTIONS,
  TRANSLATION_SERVICE,
  type MetadataModuleOptions,
} from "./metadata.types";
// ── Services ──
import { FormsService } from "./services/forms.service";
import { EntitiesService } from "./services/entities.service";
import { FieldDefinitionsService } from "./services/field-definitions.service";
import { FormSectionsService } from "./services/form-sections.service";
import { FormElementsService } from "./services/form-elements.service";
import { TablesService } from "./services/tables.service";
import { TableColumnInstancesService } from "./services/table-column-instances.service";
import { UiComponentsService } from "./services/ui-components.service";
import { ScreensService } from "./services/screens.service";
import { ScreenWidgetsService } from "./services/screen-widgets.service";
import { ScreenContextsService } from "./services/screen-contexts.service";
import { WidgetContractsService } from "./services/widget-contracts.service";
import { ModulesService } from "./services/modules.service";
import { FeaturesService } from "./services/features.service";
// ── Repositories ──
import { FormsPgRepository } from "./repositories/forms.pg.repository";
import { EntitiesPgRepository } from "./repositories/entities.pg.repository";
import { FieldDefinitionsPgRepository } from "./repositories/field-definitions.pg.repository";
import { FormSectionsPgRepository } from "./repositories/form-sections.pg.repository";
import { FormElementsPgRepository } from "./repositories/form-elements.pg.repository";
import { TablesPgRepository } from "./repositories/tables.pg.repository";
import { TableColumnInstancesPgRepository } from "./repositories/table-column-instances.pg.repository";
import { UiComponentsPgRepository } from "./repositories/ui-components.pg.repository";
import { ScreensPgRepository } from "./repositories/screens.pg.repository";
import { ScreenWidgetsPgRepository } from "./repositories/screen-widgets.pg.repository";
import { ScreenContextsPgRepository } from "./repositories/screen-contexts.pg.repository";
import { WidgetContractsPgRepository } from "./repositories/widget-contracts.pg.repository";
import { ModulesPgRepository } from "./repositories/modules.pg.repository";
import { FeaturesPgRepository } from "./repositories/features.pg.repository";
// ── Controller modules ──
import { FormsModule } from "./modules/forms/forms.module";
import { EntitiesModule } from "./modules/entities/entities.module";
import { FieldDefinitionsModule } from "./modules/field-definitions/field-definitions.module";
import { FormSectionsModule } from "./modules/form-sections/form-sections.module";
import { FormElementsModule } from "./modules/form-elements/form-elements.module";
import { TablesModule } from "./modules/tables/tables.module";
import { TableColumnInstancesModule } from "./modules/table-column-instances/table-column-instances.module";
import { UiComponentsModule } from "./modules/ui-components/ui-components.module";
import { ScreensModule } from "./modules/screens/screens.module";
import { ScreenWidgetsModule } from "./modules/screen-widgets/screen-widgets.module";
import { ScreenContextsModule } from "./modules/screen-contexts/screen-contexts.module";
import { WidgetContractsModule } from "./modules/widget-contracts/widget-contracts.module";
import { ModulesModule } from "./modules/modules-navigation/modules.module";
import { FeaturesModule } from "./modules/features/features.module";

@Module({})
export class MetadataModule {
  static forRoot(options: MetadataModuleOptions): DynamicModule {
    const features = {
      multiTenant: true,
      accessControl: true,
      softDelete: true,
      fieldVisibility: true,
      translations: false,
      ...options.features,
    };

    const providers: NonNullable<DynamicModule["providers"]> = [
      { provide: METADATA_OPTIONS, useValue: { ...options, features } },
      RequestContext,
      // ── Services ──
      FormsService,
      EntitiesService,
      FieldDefinitionsService,
      FormSectionsService,
      FormElementsService,
      TablesService,
      TableColumnInstancesService,
      UiComponentsService,
      ScreensService,
      ScreenWidgetsService,
      ScreenContextsService,
      WidgetContractsService,
      ModulesService,
      FeaturesService,
      // ── Repositories ──
      FormsPgRepository,
      EntitiesPgRepository,
      FieldDefinitionsPgRepository,
      FormSectionsPgRepository,
      FormElementsPgRepository,
      TablesPgRepository,
      TableColumnInstancesPgRepository,
      UiComponentsPgRepository,
      ScreensPgRepository,
      ScreenWidgetsPgRepository,
      ScreenContextsPgRepository,
      WidgetContractsPgRepository,
      ModulesPgRepository,
      FeaturesPgRepository,
    ];

    if (features.accessControl) {
      providers.push(AccessControlService);
    }

    // ── Translation service ──────────────────────────────────────
    if (options.services?.translationService) {
      providers.push({
        provide: TRANSLATION_SERVICE,
        useClass: options.services.translationService,
      });
    }

    return {
      global: true,
      module: MetadataModule,
      imports: [
        FormsModule,
        EntitiesModule,
        FieldDefinitionsModule,
        FormSectionsModule,
        FormElementsModule,
        TablesModule,
        TableColumnInstancesModule,
        UiComponentsModule,
        ScreensModule,
        ScreenWidgetsModule,
        ScreenContextsModule,
        WidgetContractsModule,
        ModulesModule,
        FeaturesModule,
        ...(options.imports ?? []),
      ],
      providers,
      exports: [
        RequestContext,
        FormsService,
        EntitiesService,
        FieldDefinitionsService,
        FormSectionsService,
        FormElementsService,
        TablesService,
        TableColumnInstancesService,
        UiComponentsService,
        ScreensService,
        ScreenWidgetsService,
        ScreenContextsService,
        WidgetContractsService,
        ModulesService,
        FeaturesService,
        ...(features.accessControl ? [AccessControlService] : []),
      ],
    };
  }
}
