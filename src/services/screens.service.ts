import {
  BadRequestDto,
  ForbiddenDto,
  HttpException,
  NotFoundDto,
} from "@esmaeel_emadi/ts-exc";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { eq, SQL } from "drizzle-orm";
import {
  AccessControlService,
  RequestContext,
  ITranslationService,
} from "@esmaeel_emadi/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { TRANSLATION_SERVICE } from "../metadata.types";
import {
  screenContexts,
  screens,
  screenWidgets,
  widgetContracts,
} from "../schemas";
import type {
  IWidgetParamBinding,
  IWidgetParam,
} from "../modules/screen-widgets/types";
import { ScreensPgRepository } from "../repositories/screens.pg.repository";
import { ScreenContextsPgRepository } from "../repositories/screen-contexts.pg.repository";
import { ScreenWidgetsPgRepository } from "../repositories/screen-widgets.pg.repository";
import { WidgetContractsPgRepository } from "../repositories/widget-contracts.pg.repository";

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
    @Optional()
    private readonly widgetContractsRepo?: WidgetContractsPgRepository,
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
  // Render
  // ──────────────────────────────────────────────────────────────────

  async render(
    screenId: string,
  ): Promise<Record<string, unknown> | HttpException> {
    // 1. Load screen
    const screen = await this.repo.selectOneById(screenId);
    if (!screen) return new NotFoundDto();

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

    // 4. For each widget, resolve its contract and params
    const resolvedWidgets = await Promise.all(
      (Array.isArray(widgets) ? widgets : []).map(async (widget: any) => {
        let contract: { params: IWidgetParam[] } | null = null;

        if (widget.resourceId && this.widgetContractsRepo) {
          const specific = await this.widgetContractsRepo.selectOne(
            eq(widgetContracts.resourceId, widget.resourceId) as SQL,
          );
          if (specific) {
            contract = { params: specific.params as any as IWidgetParam[] };
          }
        }

        if (!contract && this.widgetContractsRepo) {
          const generic = await this.widgetContractsRepo.selectOne(
            eq(widgetContracts.widgetType, widget.widgetType) as SQL,
          );
          if (generic) {
            contract = { params: generic.params as any as IWidgetParam[] };
          }
        }

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
          contract,
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
