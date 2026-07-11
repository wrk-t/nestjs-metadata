import {
  BadRequestDto,
  ForbiddenDto,
  HttpException,
  NotFoundDto,
} from "@wrk-t/ts-exc";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { eq, SQL } from "drizzle-orm";
import {
  AccessControlService,
  RequestContext,
  ITranslationService,
} from "@wrk-t/nestjs-core";
import { ClsService } from "nestjs-cls";
import { MetadataBaseService } from "../common/metadata-base-service";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { screenContexts, screens, screenWidgets } from "../schemas";
import type { IWidgetParamBinding } from "../modules/screen-widgets/types";
import { ScreensPgRepository } from "../repositories/screens.pg.repository";
import { ScreenContextsPgRepository } from "../repositories/screen-contexts.pg.repository";
import { ScreenWidgetsPgRepository } from "../repositories/screen-widgets.pg.repository";

@Injectable()
export class ScreensService extends MetadataBaseService<
  typeof screens,
  ScreensPgRepository
> {
  logger = new Logger(ScreensService.name);

  constructor(
    repo: ScreensPgRepository,
    @Optional() private readonly access?: AccessControlService,
    @Optional() requestContext?: RequestContext,
    @Optional()
    @Inject(TRANSLATION_SERVICE)
    readonly translationService?: ITranslationService,
    @Optional()
    private readonly screenContextsRepo?: ScreenContextsPgRepository,
    @Optional()
    private readonly screenWidgetsRepo?: ScreenWidgetsPgRepository,
    @Optional() private readonly cls?: ClsService,
  ) {
    super(repo, requestContext, translationService);
  }

  protected override guardCreate(
    data: typeof screens.$inferInsert,
  ): BadRequestDto | ForbiddenDto | undefined {
    const isAllTenants = this.requestContext
      ?.getScopesForResource("tenants")
      .includes("all");

    const providedTenantId = data.tenantId ?? undefined;

    if (!isAllTenants) {
      const userTenantId = this.requestContext?.getTenantId();
      if (!userTenantId) {
        return new ForbiddenDto(
          "You must belong to a tenant to create a screen",
        );
      }
      if (providedTenantId && providedTenantId !== userTenantId) {
        return new ForbiddenDto(
          "You can only create screens for your own tenant",
        );
      }
      if (!providedTenantId) {
        return new BadRequestDto("tenantId is required");
      }
    }
  }

  protected override guardUpdate(
    _id: string,
    existing: typeof screens.$inferSelect,
    data: Partial<typeof screens.$inferInsert>,
  ): ForbiddenDto | undefined {
    const accessErr = this.access?.guardResourceAccess("screens", existing);
    if (accessErr) return accessErr as any;

    if (data.tenantId !== undefined && data.tenantId !== existing.tenantId) {
      return this.access?.requireScope("tenants", "all") as any;
    }
  }

  protected override guardDelete(
    _id: string,
    _existing: typeof screens.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("screens", "all") as any;
  }

  protected override guardRecover(
    _id: string,
    _existing: typeof screens.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("screens", "all") as any;
  }

  // ──────────────────────────────────────────────────────────────────
  // List — filtered by visibleToPermissions
  // ──────────────────────────────────────────────────────────────────

  override async findMany(filters: any) {
    const result = await super.findMany(filters);
    if (result instanceof HttpException) return result;

    const scopeMap = this.resolveScopeMap();
    if (Object.keys(scopeMap).length === 0) return result;

    result.data = result.data.filter((s: any) => {
      const visPerms = s.visibleToPermissions as Array<{
        resource: string;
        action: string;
        scope?: "own" | "tenant" | "all";
      }> | null;
      if (!visPerms?.length) return true;
      return visPerms.every((req) => {
        const userScopes: string[] = scopeMap[req.resource] ?? [];
        if (!req.scope) return userScopes.length > 0;
        return userScopes.includes(req.scope);
      });
    });

    return result;
  }

  private resolveScopeMap(): Record<string, string[]> {
    return (this.repo as any).getScopeContext?.()?.scopeMap ?? {};
  }

  async render(
    screenId: string,
  ): Promise<Record<string, unknown> | HttpException> {
    // 1. Load screen
    const screen = await this.repo.selectOneById(screenId);
    if (!screen) return new NotFoundDto("TODO");

    // 1.5 Check permission-based visibility
    const visPerms = screen.visibleToPermissions as Array<{
      resource: string;
      action: string;
      scope?: "own" | "tenant" | "all";
    }> | null;
    if (visPerms?.length) {
      const scopeMap = this.resolveScopeMap();
      const hasAll = visPerms.every((req) => {
        const userScopes: string[] = scopeMap[req.resource] ?? [];
        if (!req.scope) return userScopes.length > 0;
        return userScopes.includes(req.scope);
      });
      if (!hasAll)
        return new ForbiddenDto("errors.forbidden").details({
          reason: "screen_visibility",
          requiredPermissions: visPerms,
        });
    }

    // 2. Load screen context (optional)
    const context = this.screenContextsRepo
      ? await this.screenContextsRepo.selectOne(
          eq(screenContexts.screenId, screenId) as SQL,
        )
      : null;

    // 3. Load widgets ordered by displayOrder
    const widgets = this.screenWidgetsRepo
      ? await this.screenWidgetsRepo.selectMany(
          eq(screenWidgets.screenId, screenId) as SQL,
        )
      : [];

    // 4. Resolve widget params
    const resolvedWidgets = await Promise.all(
      (Array.isArray(widgets) ? widgets : []).map(async (widget: any) => {
        const resolvedParams: Record<string, unknown> = {};
        const bindings = widget.paramBindings as Record<
          string,
          IWidgetParamBinding
        > | null;
        if (bindings) {
          for (const [paramName, binding] of Object.entries(bindings)) {
            resolvedParams[paramName] = this.resolveBinding(
              binding,
              context,
              widget,
            );
          }
        }

        return {
          ...widget,
          resolvedParams,
        };
      }),
    );

    return {
      screen,
      context: context ? { params: context.params } : null,
      widgets: resolvedWidgets,
    };
  }

  private resolveBinding(
    binding: IWidgetParamBinding,
    context: Record<string, unknown> | null,
    _widget: Record<string, unknown>,
  ): unknown {
    switch (binding.source) {
      case "literal":
        return binding.value ?? null;
      case "scope":
        return this.requestContext?.getTenantId() ?? null;
      case "screen":
        if (context && binding.value) {
          const ctxParams = (context.params as Array<{ name: string }>) ?? [];
          const match = ctxParams.find(
            (p: { name: string }) => p.name === binding.value,
          );
          return match ? `{{screen.${binding.value}}}` : null;
        }
        return null;
      default:
        return null;
    }
  }
}
