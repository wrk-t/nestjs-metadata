import {
  BadRequestDto,
  ForbiddenDto,
  HttpException,
  NotFoundDto,
} from "@wrk-t/ts-exc";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { eq, inArray, SQL } from "drizzle-orm";
import {
  AccessControlService,
  RequestContext,
  ITranslationService,
} from "@wrk-t/nestjs-core";
import { ClsService } from "nestjs-cls";
import { MetadataBaseService } from "../common/metadata-base-service";
import {
  satisfiesTenantRequirement,
  type TenantRequirement,
} from "../common/tenant-requirement";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { modules, screenContexts, screens, screenWidgets } from "../schemas";
import type { IWidgetParamBinding } from "../modules/screen-widgets/types";
import { ScreensPgRepository } from "../repositories/screens.pg.repository";
import { ScreenContextsPgRepository } from "../repositories/screen-contexts.pg.repository";
import { ScreenWidgetsPgRepository } from "../repositories/screen-widgets.pg.repository";
import { ModulesPgRepository } from "../repositories/modules.pg.repository";
import { ComponentsPgRepository } from "../repositories/components.pg.repository";

@Injectable()
export class ScreensService extends MetadataBaseService<
  typeof screens,
  ScreensPgRepository,
  number
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
    @Optional() private readonly modulesRepo?: ModulesPgRepository,
    @Optional() private readonly componentsRepo?: ComponentsPgRepository,
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
    _id: number,
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
    _id: number,
    _existing: typeof screens.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("screens", "all") as any;
  }

  protected override guardRecover(
    _id: number,
    _existing: typeof screens.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("screens", "all") as any;
  }

  // ──────────────────────────────────────────────────────────────────
  // List — filtered by tenant-membership + permission visibility
  // ──────────────────────────────────────────────────────────────────

  	override async findMany(filters: any) {
  		const result = await super.findMany(filters);
  		if (result instanceof HttpException) return result;

  		const tenantId = this.requestContext?.getTenantId();
  		const isSuperAdmin = this.requestContext?.getIsSuperAdmin() ?? false;
  		const moduleReqs = await this.resolveModuleRequirements(
  			result.data.map((s: any) => s.moduleId),
  		);

  		const scopeMap = this.resolveScopeMap();
  		const hasScopeMap = Object.keys(scopeMap).length > 0;

  		result.data = result.data.filter((s: any) => {
  			// Tenant-membership visibility (own requirement + module's)
  			// Super admins bypass the tenant requirement entirely.
  			if (
  				!isSuperAdmin &&
  				!satisfiesTenantRequirement(s.tenantRequirement, tenantId)
  			) {
  				return false;
  			}
  			if (
  				!isSuperAdmin &&
  				!satisfiesTenantRequirement(moduleReqs.get(s.moduleId), tenantId)
  			) {
  				return false;
  			}

      // Permission-based visibility
      if (hasScopeMap) {
        const visPerms = s.visibleToPermissions as Array<{
          resource: string;
          action: string;
          scope?: "own" | "tenant" | "all";
        }> | null;
        if (visPerms?.length) {
          const allowed = visPerms.every((req) => {
            const userScopes: string[] = scopeMap[req.resource] ?? [];
            if (!req.scope) return userScopes.length > 0;
            return userScopes.includes(req.scope);
          });
          if (!allowed) return false;
        }
      }

      return true;
    });

    return result;
  }

  /** Map moduleId → tenantRequirement for the given screen moduleIds. */
  private async resolveModuleRequirements(
    moduleIds: Array<number | null>,
  ): Promise<Map<number, TenantRequirement>> {
    const map = new Map<number, TenantRequirement>();
    if (!this.modulesRepo) return map;
    const ids = [...new Set(moduleIds.filter((id): id is number => Boolean(id)))];
    if (ids.length === 0) return map;
    const rows = await this.modulesRepo.selectMany(
      inArray(modules.id, ids) as SQL,
    );
    for (const row of rows ?? []) {
      map.set(row.id, row.tenantRequirement);
    }
    return map;
  }

  private resolveScopeMap(): Record<string, string[]> {
    return (this.repo as any).getScopeContext?.()?.scopeMap ?? {};
  }

  	async render(
  		screenId: number,
  	): Promise<Record<string, unknown> | HttpException> {
    // 1. Load screen
    const screen = await this.repo.selectOneById(screenId);
    if (!screen) return new NotFoundDto("TODO");

    		// 1.25 Check tenant-membership visibility (screen + its module)
    		const tenantId = this.requestContext?.getTenantId();
    		const isSuperAdmin = this.requestContext?.getIsSuperAdmin() ?? false;
    		if (
    			!isSuperAdmin &&
    			!satisfiesTenantRequirement(screen.tenantRequirement, tenantId)
    		) {
    			return new ForbiddenDto("errors.forbidden").details({
    				reason: "screen_tenant_requirement",
    				required: screen.tenantRequirement,
    			});
    		}
    		if (this.modulesRepo) {
    			const mod = await this.modulesRepo.selectOneById(screen.moduleId);
    			if (
    				mod &&
    				!isSuperAdmin &&
    				!satisfiesTenantRequirement(mod.tenantRequirement, tenantId)
    			) {
    				return new ForbiddenDto("errors.forbidden").details({
    					reason: "module_tenant_requirement",
    					required: mod.tenantRequirement,
    				});
    			}
    }

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

	/**
	 * Components used on a screen — the screen's widget components plus,
	 * recursively, every component they reference via component_ref elements
	 * (page → tabs → tables/forms → sections …). Deduplicated, ordered
	 * breadth-first (widget components first).
	 */
	async findScreenComponents(screenId: number) {
		const widgets = this.screenWidgetsRepo
			? await this.screenWidgetsRepo.selectMany(
					eq(screenWidgets.screenId, screenId) as SQL,
				)
			: [];
		if (!this.componentsRepo) return [];

		const seedIds = [
			...new Set(
				(Array.isArray(widgets) ? widgets : [])
					.map((w: any) => w.resourceId)
					.filter(Boolean),
			),
		] as number[];
		if (seedIds.length === 0) return [];

		// BFS over component_ref elements (visited set guards against cycles)
		const visited = new Set<number>();
		const order: number[] = [];
		let frontier = seedIds;
		for (let depth = 0; depth < 8 && frontier.length > 0; depth++) {
			const fresh = frontier.filter((id) => !visited.has(id));
			if (fresh.length === 0) break;
			for (const id of fresh) {
				visited.add(id);
				order.push(id);
			}
			const refs = await this.componentsRepo.batchResolveRefs(fresh);
			const next = new Set<number>();
			for (const { elements } of refs.values()) {
				for (const el of elements ?? []) {
					if (el.elementType === "component_ref" && el.referencedComponentId) {
						next.add(el.referencedComponentId);
					}
				}
			}
			frontier = [...next];
		}

		const comps = await this.componentsRepo.findComponentsByIds(order);
		const compById = new Map(comps.map((c) => [c.id, c]));
		const bpIds = [...new Set(comps.map((c: any) => c.blueprintId))] as number[];
		const bps =
			bpIds.length > 0
				? await this.componentsRepo.findBlueprintsByIds(bpIds)
				: [];
		const bpMap = new Map(bps.map((b: any) => [b.id, b.name]));

		let items = order
			.map((id) => compById.get(id))
			.filter(Boolean)
			.map((c: any) => ({
				id: c.id,
				name: c.name,
				key: c.displayName ?? c.name,
				type: bpMap.get(c.blueprintId) ?? null,
				description: c.description,
			}));

		// Resolve $trl_ keys so the list shows translated names.
		if (this.translationService && items.length > 0) {
			const locale = this.requestContext?.getLocale() ?? "en";
			const tenantId = this.requestContext?.getTenantId();
			const resolved = await this.translationService.resolveTranslationsBatch(
				items,
				locale,
				tenantId,
			);
			if (Array.isArray(resolved)) items = resolved as typeof items;
		}
		return items;
	}

	/**
	 * Component tree of a screen — the screen's widget components plus,
	 * recursively, every component they reference via component_ref elements
	 * (page → tabs → tables/forms → sections …).
	 *
	 * Unlike findScreenComponents (flat BFS list), this returns a nested tree
	 * that preserves slots, grid positions (row/col/colSpan), field definitions
	 * and element order — the data needed to draw a layout diagram that can
	 * later be edited.
	 */
	async findScreenTree(screenId: number) {
		const screen = await this.repo.selectOneById(screenId);
		if (!screen) return new NotFoundDto("TODO");

		const screenInfo = {
			id: screen.id,
			name: screen.name,
			displayName: screen.displayName,
		};
		if (!this.componentsRepo) {
			return { screen: screenInfo, roots: [] };
		}

		const widgets = this.screenWidgetsRepo
			? await this.screenWidgetsRepo.selectMany(
					eq(screenWidgets.screenId, screenId) as SQL,
				)
			: [];
		const seedIds = [
			...new Set(
				(Array.isArray(widgets) ? widgets : [])
					.map((w: any) => w.resourceId)
					.filter(Boolean),
			),
		] as number[];
		if (seedIds.length === 0) {
			return { screen: screenInfo, roots: [] };
		}

		// BFS over component_ref elements (visited set guards against cycles),
		// collecting each component's blueprint + elements.
		const elementsByComp = new Map<number, any[]>();
		const blueprintByComp = new Map<number, string>();
		const visited = new Set<number>();
		let frontier = seedIds;
		for (let depth = 0; depth < 8 && frontier.length > 0; depth++) {
			const fresh = frontier.filter((id) => !visited.has(id));
			if (fresh.length === 0) break;
			for (const id of fresh) visited.add(id);

			const refs = await this.componentsRepo.batchResolveRefs(fresh);
			const next = new Set<number>();
			for (const [id, { blueprint, elements }] of refs) {
				elementsByComp.set(id, elements);
				blueprintByComp.set(id, blueprint.name);
				for (const el of elements ?? []) {
					if (el.elementType === "component_ref" && el.referencedComponentId) {
						next.add(el.referencedComponentId);
					}
				}
			}
			frontier = [...next];
		}

		const comps = await this.componentsRepo.findComponentsByIds([...visited]);
		const compById = new Map(comps.map((c) => [c.id, c]));

		const buildNode = (id: number, seen: Set<number>): any => {
			if (seen.has(id)) return null; // cycle guard
			const comp = compById.get(id);
			if (!comp) return null;

			const nextSeen = new Set(seen);
			nextSeen.add(id);

			const elements = (elementsByComp.get(id) ?? [])
				.filter((el) => el.isActive !== false)
				.sort(
					(a, b) =>
						String(a.slotName ?? "").localeCompare(String(b.slotName ?? "")) ||
						a.displayOrder - b.displayOrder,
				)
				.map((el) => {
					const base: Record<string, unknown> = {
						id: el.id,
						slotName: el.slotName,
						elementType: el.elementType,
						displayOrder: el.displayOrder,
						grid: el.grid ?? null,
						paramBindings: el.paramBindings ?? null,
						overrides: el.overrides ?? null,
					};
					if (el.elementType === "component_ref" && el.referencedComponentId) {
						base.child = buildNode(el.referencedComponentId, nextSeen);
					} else if (el.elementType === "field") {
						const fd = el.fieldDefinition as any;
						if (fd) {
							base.fieldDefinition = {
								id: fd.id,
								name: fd.name ?? null,
								type: fd.type ?? null,
								displayName: fd.displayName ?? null,
							};
						}
					}
					return base;
				});

			return {
				id: comp.id,
				name: comp.name,
				displayName: comp.displayName,
				type: blueprintByComp.get(id) ?? null,
				description: comp.description,
				elements,
			};
		};

		const roots = seedIds
			.map((id) => buildNode(id, new Set()))
			.filter(Boolean);

		const payload = { screen: screenInfo, roots };

		// Resolve $trl_ keys so the diagram shows translated names.
		if (this.translationService && roots.length > 0) {
			const locale = this.requestContext?.getLocale() ?? "en";
			const tenantId = this.requestContext?.getTenantId();
			const resolved = await this.translationService.resolveTranslationsBatch(
				[payload],
				locale,
				tenantId,
			);
			if (Array.isArray(resolved) && resolved[0]) {
				return resolved[0];
			}
		}
		return payload;
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
