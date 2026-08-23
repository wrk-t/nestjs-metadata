import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { RequestContext, ITranslationService } from "@wrk-t/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { settings } from "../schemas";
import { SettingsPgRepository } from "../repositories/settings.pg.repository";

@Injectable()
export class SettingsService extends MetadataBaseService<
  typeof settings,
  SettingsPgRepository,
  number
> {
  logger = new Logger(SettingsService.name);

  constructor(
    repo: SettingsPgRepository,
    @Optional()
    @Inject(TRANSLATION_SERVICE)
    readonly translationService?: ITranslationService,
    @Optional() requestContext?: RequestContext,
  ) {
    super(repo, requestContext, translationService);
  }

  protected override guardCreate(_data: any): undefined {}
  protected override guardUpdate(
    _id: number,
    _existing: any,
    _data: any,
  ): undefined {}
  protected override guardDelete(_id: number, _existing: any): undefined {}
  protected override guardRecover(_id: number, _existing: any): undefined {}
}
