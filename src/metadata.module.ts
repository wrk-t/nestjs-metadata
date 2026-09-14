import { DynamicModule, Module } from "@nestjs/common";
import { AccessControlService, RequestContext } from "@wrk-t/nestjs-core";
import { ClsService, ClsServiceManager } from "nestjs-cls";
import {
  METADATA_OPTIONS,
  type MetadataModuleOptions,
  TRANSLATION_SERVICE,
} from "./metadata.types";
import { MetadataModuleBootstrapService } from "./bootstrap/metadata-module.bootstrap";
import { ComponentsModule } from "./modules/components/components.module";
// ── Controller modules ──
import { EntitiesModule } from "./modules/entities/entities.module";
import { EntityTypesModule } from "./modules/entity-types/entity-types.module";
import { FeaturesModule } from "./modules/features/features.module";
import { FieldDefinitionsModule } from "./modules/field-definitions/field-definitions.module";
import { ModulesModule } from "./modules/modules-navigation/modules.module";
import { ScreenContextsModule } from "./modules/screen-contexts/screen-contexts.module";
import { ScreensModule } from "./modules/screens/screens.module";
import { UiComponentsModule } from "./modules/ui-components/ui-components.module";
import { ComponentsPgRepository } from "./repositories/components.pg.repository";
// ── Repositories ──
import { EntitiesPgRepository } from "./repositories/entities.pg.repository";
import { EntityTypesPgRepository } from "./repositories/entity-types.pg.repository";
import { FeaturesPgRepository } from "./repositories/features.pg.repository";
import { SettingsPgRepository } from "./repositories/settings.pg.repository";
import { FieldDefinitionsPgRepository } from "./repositories/field-definitions.pg.repository";
import { ModulesPgRepository } from "./repositories/modules.pg.repository";
import { ScreenContextsPgRepository } from "./repositories/screen-contexts.pg.repository";
import { ScreensPgRepository } from "./repositories/screens.pg.repository";
import { UiComponentsPgRepository } from "./repositories/ui-components.pg.repository";
import { ComponentsService } from "./services/components.service";
// ── Services ──
import { EntitiesService } from "./services/entities.service";
import { EntityTypesService } from "./services/entity-types.service";
import { FeaturesService } from "./services/features.service";
import { SettingsService } from "./services/settings.service";
import { FieldDefinitionsService } from "./services/field-definitions.service";
import { ModulesService } from "./services/modules.service";
import { ScreenContextsService } from "./services/screen-contexts.service";
import { ScreensService } from "./services/screens.service";
import { UiComponentsService } from "./services/ui-components.service";
import { CapabilityService } from "./services/capability.service";

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
      // ── Context ──
      // Resolve the @Optional() RequestContext injected by the
      // services and bind it to the host app's CLS store so tenant-
      // aware filters see the caller's tenant. The hosting app is
      // responsible for populating the store (auth guard or
      // request middleware). `options.cls` must be the host's own
      // ClsService singleton — a different physical nestjs-cls copy
      // would have its own isolated store.
      RequestContext,
      {
        provide: ClsService,
        useValue:
          (options.cls as ClsService | undefined) ??
          ClsServiceManager.getClsService(),
      },
      // ── Bootstrap (metadata module self-registration) ──
      MetadataModuleBootstrapService,
	      // ── Services ──
	      EntitiesService,
	      EntityTypesService,
	      FieldDefinitionsService,
      UiComponentsService,
	      ScreensService,
	      ScreenContextsService,
		      ModulesService,
		      FeaturesService,
		      SettingsService,
		      ComponentsService,
		      CapabilityService,
		      // ── Repositories ──
	      EntitiesPgRepository,
	      EntityTypesPgRepository,
	      FieldDefinitionsPgRepository,
	      UiComponentsPgRepository,
	      ScreensPgRepository,
	      ScreenContextsPgRepository,
	      ModulesPgRepository,
	      FeaturesPgRepository,
	      SettingsPgRepository,
	      ComponentsPgRepository,
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
	        EntitiesModule,
	        EntityTypesModule,
	        FieldDefinitionsModule,
        UiComponentsModule,
	        ScreensModule,
	        ScreenContextsModule,
	        ModulesModule,
        FeaturesModule,
        ComponentsModule,
        ...(options.imports ?? []),
      ],
      providers,
	      exports: [
	        EntitiesService,
	        EntityTypesService,
	        FieldDefinitionsService,
        UiComponentsService,
	        ScreensService,
	        ScreenContextsService,
		        ModulesService,
	        FeaturesService,
	        SettingsService,
	        ComponentsService,
	        CapabilityService,
	        ...(features.accessControl ? [AccessControlService] : []),
      ],
    };
  }
}
