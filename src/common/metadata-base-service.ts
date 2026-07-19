import { Logger, Optional } from "@nestjs/common";
import {
  ScopedBaseService,
  RequestContext,
  ITranslationService,
  TBasePgTable,
  BasePostgresRepository,
} from "@wrk-t/nestjs-core";

export abstract class MetadataBaseService<
  TSchema extends TBasePgTable,
  TRepo extends BasePostgresRepository<any, TSchema>,
> extends ScopedBaseService<TSchema, TRepo> {
  abstract logger: Logger;

  constructor(
    repo: TRepo,
    @Optional() requestContext?: RequestContext,
    @Optional() readonly translationService?: ITranslationService,
  ) {
    super(repo, requestContext, translationService);
  }

  protected async resolve<T>(record: T, locale: string): Promise<T> {
    if (!this.translationService || !record) return record;
    return this.translationService.resolveTranslations(
      record,
      locale,
      this.requestContext?.getTenantId(),
    ) as Promise<T>;
  }

  async findMany(query: any): Promise<any> {
    const result = await super.findMany(query);
    const locale = query?._locale ?? this.requestContext?.getLocale() ?? "en";
    return this.resolve(result, locale);
  }

  async selectOneById(id: string): Promise<any> {
    const result = await super.selectOneById(id);
    const locale = this.requestContext?.getLocale() ?? "en";
    return this.resolve(result, locale);
  }
}
