import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { RequestContext, ITranslationService } from "@wrk-t/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { entities } from "../schemas";
import { EntitiesPgRepository } from "../repositories/entities.pg.repository";

@Injectable()
export class EntitiesService extends MetadataBaseService<
  typeof entities,
  EntitiesPgRepository
> {
  logger = new Logger(EntitiesService.name);

  constructor(
    repo: EntitiesPgRepository,
    @Optional()
    @Inject(TRANSLATION_SERVICE)
    readonly translationService?: ITranslationService,
    @Optional() requestContext?: RequestContext,
  ) {
    super(repo, requestContext, translationService);
  }

  protected override guardCreate(_data: any): undefined {}
  protected override guardUpdate(
    _id: string,
    _existing: any,
    _data: any,
  ): undefined {}
  protected override guardDelete(_id: string, _existing: any): undefined {}
  protected override guardRecover(_id: string, _existing: any): undefined {}
}
