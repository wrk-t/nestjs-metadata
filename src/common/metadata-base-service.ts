import { Logger, Optional } from "@nestjs/common";
import {
  ScopedBaseService,
  RequestContext,
  ITranslationService,
  TBasePgTable,
  BasePostgresRepository,
} from "@wrk-t/nestjs-core";
import { TRANSLATION_SERVICE } from "../metadata.types";

/**
 * Base service for metadata entities with translation support.
 * Extends ScopedBaseService with automatic $trl_ resolution on
 * findMany() and selectOneById().
 */
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

  /**
   * Resolve $trl_ keys in a record using the translation service.
   */
  protected async resolve<T>(record: T, locale?: string): Promise<T> {
    if (!this.translationService || !record) return record;
    const resolvedLocale = locale ?? this.safeGetLocale();
    return this.translationService.resolveTranslations(
      record,
      resolvedLocale,
      this.safeGetTenantId(),
    ) as Promise<T>;
  }

  /** Safely get locale from RequestContext, falling back to "en". */
  private safeGetLocale(): string {
    try {
      return this.requestContext?.getLocale() ?? "en";
    } catch {
      return "en";
    }
  }

  /** Safely get tenantId from RequestContext, falling back to undefined. */
  private safeGetTenantId(): string | undefined | null {
    try {
      return this.requestContext?.getTenantId();
    } catch {
      return undefined;
    }
  }

  async findMany(query: any): Promise<any> {
    const result = await super.findMany(query);
    return this.resolve(result);
  }

  async selectOneById(id: string): Promise<any> {
    const result = await super.selectOneById(id);
    return this.resolve(result);
  }
}
