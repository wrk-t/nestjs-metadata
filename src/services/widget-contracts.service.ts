import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { RequestContext, ITranslationService } from "@esmaeel_emadi/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { widgetContracts } from "../schemas";
import { WidgetContractsPgRepository } from "../repositories/widget-contracts.pg.repository";

@Injectable()
export class WidgetContractsService extends MetadataBaseService<
  typeof widgetContracts,
  WidgetContractsPgRepository
> {
  logger = new Logger(WidgetContractsService.name);

  constructor(
    repo: WidgetContractsPgRepository,
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
