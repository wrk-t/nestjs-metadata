import { NotFoundDto } from "@wrk-t/ts-exc";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { eq } from "drizzle-orm";
import {
  RequestContext,
  ITranslationService,
} from "@wrk-t/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { screenContexts } from "../schemas";
import { ScreenContextsPgRepository } from "../repositories/screen-contexts.pg.repository";

@Injectable()
export class ScreenContextsService extends MetadataBaseService<
  typeof screenContexts,
  ScreenContextsPgRepository
> {
  logger = new Logger(ScreenContextsService.name);

  constructor(
    repo: ScreenContextsPgRepository,
    @Optional() requestContext?: RequestContext,
    @Optional()
    @Inject(TRANSLATION_SERVICE)
    readonly translationService?: ITranslationService,
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

  async findByScreenId(screenId: string) {
    const ctx = await this.repo.selectOne(
      eq(screenContexts.screenId, screenId),
    );
    if (!ctx) return new NotFoundDto([]);
    return ctx;
  }
}
