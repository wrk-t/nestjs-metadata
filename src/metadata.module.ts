import { DynamicModule, Module } from "@nestjs/common";
import { AccessControlService } from "@wrk-t/nestjs-core";
import {
	METADATA_OPTIONS,
	type MetadataModuleOptions,
	TRANSLATION_SERVICE,
} from "./metadata.types";
import { ComponentsModule } from "./modules/components/components.module";
// ── Controller modules ──
import { EntitiesModule } from "./modules/entities/entities.module";
import { FeaturesModule } from "./modules/features/features.module";
import { FieldDefinitionsModule } from "./modules/field-definitions/field-definitions.module";
import { ModulesModule } from "./modules/modules-navigation/modules.module";
import { ScreenContextsModule } from "./modules/screen-contexts/screen-contexts.module";
import { ScreenWidgetsModule } from "./modules/screen-widgets/screen-widgets.module";
import { ScreensModule } from "./modules/screens/screens.module";
import { UiComponentsModule } from "./modules/ui-components/ui-components.module";
import { ComponentsPgRepository } from "./repositories/components.pg.repository";
// ── Repositories ──
import { EntitiesPgRepository } from "./repositories/entities.pg.repository";
import { FeaturesPgRepository } from "./repositories/features.pg.repository";
import { FieldDefinitionsPgRepository } from "./repositories/field-definitions.pg.repository";
import { ModulesPgRepository } from "./repositories/modules.pg.repository";
import { ScreenContextsPgRepository } from "./repositories/screen-contexts.pg.repository";
import { ScreenWidgetsPgRepository } from "./repositories/screen-widgets.pg.repository";
import { ScreensPgRepository } from "./repositories/screens.pg.repository";
import { UiComponentsPgRepository } from "./repositories/ui-components.pg.repository";
import { ComponentsService } from "./services/components.service";
// ── Services ──
import { EntitiesService } from "./services/entities.service";
import { FeaturesService } from "./services/features.service";
import { FieldDefinitionsService } from "./services/field-definitions.service";
import { ModulesService } from "./services/modules.service";
import { ScreenContextsService } from "./services/screen-contexts.service";
import { ScreenWidgetsService } from "./services/screen-widgets.service";
import { ScreensService } from "./services/screens.service";
import { UiComponentsService } from "./services/ui-components.service";

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
			// ── Services ──
			EntitiesService,
			FieldDefinitionsService,
			UiComponentsService,
			ScreensService,
			ScreenWidgetsService,
			ScreenContextsService,
			ModulesService,
			FeaturesService,
			ComponentsService,
			// ── Repositories ──
			EntitiesPgRepository,
			FieldDefinitionsPgRepository,
			UiComponentsPgRepository,
			ScreensPgRepository,
			ScreenWidgetsPgRepository,
			ScreenContextsPgRepository,
			ModulesPgRepository,
			FeaturesPgRepository,
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
				FieldDefinitionsModule,
				UiComponentsModule,
				ScreensModule,
				ScreenWidgetsModule,
				ScreenContextsModule,
				ModulesModule,
				FeaturesModule,
				ComponentsModule,
				...(options.imports ?? []),
			],
			providers,
			exports: [
				EntitiesService,
				FieldDefinitionsService,
				UiComponentsService,
				ScreensService,
				ScreenWidgetsService,
				ScreenContextsService,
				ModulesService,
				FeaturesService,
				ComponentsService,
				...(features.accessControl ? [AccessControlService] : []),
			],
		};
	}
}
