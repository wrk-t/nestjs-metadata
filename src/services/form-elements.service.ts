import { BadRequestDto, ForbiddenDto } from "@esmaeel_emadi/ts-exc";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { AccessControlService, RequestContext, ITranslationService } from "@esmaeel_emadi/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { formElements } from "../schemas";
import { FormElementsPgRepository } from "../repositories/form-elements.pg.repository";

@Injectable()
export class FormElementsService extends MetadataBaseService<
  typeof formElements,
  FormElementsPgRepository
> {
  logger = new Logger(FormElementsService.name);

  constructor(
    repo: FormElementsPgRepository,
    @Optional() private readonly access?: AccessControlService,
    @Optional() requestContext?: RequestContext,
    @Optional()
    @Inject(TRANSLATION_SERVICE)
    readonly translationService?: ITranslationService,
  ) {
    super(repo, requestContext, translationService);
  }

  protected override guardCreate(
    data: typeof formElements.$inferInsert,
  ): BadRequestDto | ForbiddenDto | undefined {
    const isAllTenants = this.requestContext
      ?.getScopesForResource("tenants")
      .includes("all");

    if (!isAllTenants) {
      const userTenantId = this.requestContext?.getTenantId();
      if (!userTenantId) {
        return new ForbiddenDto("You must belong to a tenant to create a form element");
      }
      if (
        data.tenantId !== undefined &&
        data.tenantId !== null &&
        data.tenantId !== userTenantId
      ) {
        return new ForbiddenDto(
          "Only users with full tenant access can assign a form element to a different tenant",
        );
      }
      data.tenantId = userTenantId;
    }
  }

  protected override guardUpdate(
    _id: string,
    existing: typeof formElements.$inferSelect,
    data: Partial<typeof formElements.$inferInsert>,
  ): ForbiddenDto | undefined {
    const accessErr = this.access?.guardResourceAccess("formElements", existing);
    if (accessErr) return accessErr as any;

    if (data.tenantId !== undefined && data.tenantId !== existing.tenantId) {
      return this.access?.requireScope("tenants", "all") as any;
    }
  }

  protected override guardDelete(
    _id: string,
    _existing: typeof formElements.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("formElements", "all") as any;
  }

  protected override guardRecover(
    _id: string,
    _existing: typeof formElements.$inferSelect,
  ): any {
    return this.access?.requireScope("formElements", "all") as any;
  }
}
