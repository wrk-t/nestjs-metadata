import { BadRequestDto, ForbiddenDto } from "@esmaeel_emadi/ts-exc";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { AccessControlService, RequestContext, ITranslationService } from "@esmaeel_emadi/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { formSections } from "../schemas";
import { FormSectionsPgRepository } from "../repositories/form-sections.pg.repository";

@Injectable()
export class FormSectionsService extends MetadataBaseService<
  typeof formSections,
  FormSectionsPgRepository
> {
  logger = new Logger(FormSectionsService.name);

  constructor(
    repo: FormSectionsPgRepository,
    @Optional() private readonly access?: AccessControlService,
    @Optional() requestContext?: RequestContext,
    @Optional()
    @Inject(TRANSLATION_SERVICE)
    readonly translationService?: ITranslationService,
  ) {
    super(repo, requestContext, translationService);
  }

  protected override guardCreate(
    data: typeof formSections.$inferInsert,
  ): BadRequestDto | ForbiddenDto | undefined {
    const isAllTenants = this.requestContext
      ?.getScopesForResource("tenants")
      .includes("all");

    if (!isAllTenants) {
      const userTenantId = this.requestContext?.getTenantId();
      if (!userTenantId) {
        return new ForbiddenDto("You must belong to a tenant to create a form section");
      }
      if (
        data.tenantId !== undefined &&
        data.tenantId !== null &&
        data.tenantId !== userTenantId
      ) {
        return new ForbiddenDto(
          "Only users with full tenant access can assign a form section to a different tenant",
        );
      }
      data.tenantId = userTenantId;
    }
  }

  protected override guardUpdate(
    _id: string,
    existing: typeof formSections.$inferSelect,
    data: Partial<typeof formSections.$inferInsert>,
  ): ForbiddenDto | undefined {
    const accessErr = this.access?.guardResourceAccess("formSections", existing);
    if (accessErr) return accessErr as any;

    if (data.tenantId !== undefined && data.tenantId !== existing.tenantId) {
      return this.access?.requireScope("tenants", "all") as any;
    }
  }

  protected override guardDelete(
    _id: string,
    _existing: typeof formSections.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("formSections", "all") as any;
  }

  protected override guardRecover(
    _id: string,
    _existing: typeof formSections.$inferSelect,
  ): any {
    return this.access?.requireScope("formSections", "all") as any;
  }
}
