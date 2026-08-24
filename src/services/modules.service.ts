import { BadRequestDto, ForbiddenDto, HttpException } from "@wrk-t/ts-exc";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import {
  AccessControlService,
  RequestContext,
  ITranslationService,
} from "@wrk-t/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { satisfiesTenantRequirement } from "../common/tenant-requirement";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { modules } from "../schemas";
import { ModulesPgRepository } from "../repositories/modules.pg.repository";
import { CapabilityService } from "./capability.service";

@Injectable()
export class ModulesService extends MetadataBaseService<
  typeof modules,
  ModulesPgRepository,
  number
> {
  logger = new Logger(ModulesService.name);

	  constructor(
	    repo: ModulesPgRepository,
	    @Optional() private readonly access?: AccessControlService,
	    @Optional() requestContext?: RequestContext,
	    @Optional()
	    @Inject(TRANSLATION_SERVICE)
	    readonly translationService?: ITranslationService,
	    @Optional() private readonly capability?: CapabilityService,
	  ) {
	    super(repo, requestContext, translationService);
	  }

  protected override guardCreate(
    data: typeof modules.$inferInsert,
  ): BadRequestDto | ForbiddenDto | undefined {
    const isAllTenants = this.requestContext
      ?.getScopesForResource("tenants")
      .includes("all");

    if (!isAllTenants) {
      const userTenantId = this.requestContext?.getTenantId();
      if (!userTenantId) {
        return new ForbiddenDto(
          "You must belong to a tenant to create a module",
        );
      }
      if (
        data.tenantId !== undefined &&
        data.tenantId !== null &&
        data.tenantId !== userTenantId
      ) {
        return new ForbiddenDto(
          "Only users with full tenant access can assign a module to a different tenant",
        );
      }
      data.tenantId = userTenantId;
    }
  }

  protected override guardUpdate(
    _id: number,
    existing: typeof modules.$inferSelect,
    data: Partial<typeof modules.$inferInsert>,
  ): ForbiddenDto | undefined {
    const accessErr = this.access?.guardResourceAccess("modules", existing);
    if (accessErr) return accessErr as any;

    if (data.tenantId !== undefined && data.tenantId !== existing.tenantId) {
      return this.access?.requireScope("tenants", "all") as any;
    }
  }

  protected override guardDelete(
    _id: number,
    _existing: typeof modules.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("modules", "all") as any;
  }

  protected override guardRecover(
    _id: number,
    _existing: typeof modules.$inferSelect,
  ): any {
    return this.access?.requireScope("modules", "all") as any;
  }

  // ────────────────────────────────────────────────────────────────
  // List — filtered by tenant-membership visibility
  // ────────────────────────────────────────────────────────────────

	  override async findMany(filters: any) {
	    const result = await super.findMany(filters);
	    if (result instanceof HttpException) return result;

	const tenantId = this.requestContext?.getTenantId();
	const isSuperAdmin = this.requestContext?.getIsSuperAdmin() ?? false;
	const kept: any[] = [];
	for (const m of result.data) {
		// visibleToSuperAdmin modules are only returned to super admins
		if (m.visibleToSuperAdmin && !isSuperAdmin) continue;
		if (!isSuperAdmin && !satisfiesTenantRequirement(m.tenantRequirement, tenantId)) continue;
		// Tier + feature gating (features resolve per tenant; super admin bypasses)
		if (this.capability && !(await this.capability.canAccess(m))) continue;
		kept.push(m);
	}
	    result.data = kept;

	    return result;
	  }
}
