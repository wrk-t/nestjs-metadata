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
import { modules, screenContexts, screens } from "../schemas";
import { ScreensPgRepository } from "../repositories/screens.pg.repository";
import { ScreenContextsPgRepository } from "../repositories/screen-contexts.pg.repository";
import { ModulesPgRepository } from "../repositories/modules.pg.repository";
import { ComponentsPgRepository } from "../repositories/components.pg.repository";
import { CapabilityService } from "./capability.service";

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
	    @Optional() private readonly modulesRepo?: ModulesPgRepository,
	    @Optional() private readonly componentsRepo?: ComponentsPgRepository,
	    @Optional() private readonly capability?: CapabilityService,
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

  			const tenantId = this.requestContext?.getEffectiveTenantId();
  		const isSuperAdmin = this.requestContext?.getIsSuperAdmin() ?? false;
  		const moduleReqs = await this.resolveModuleRequirements(
  			result.data.map((s: any) => s.moduleId),
  		);

  		const scopeMap = this.resolveScopeMap();
  		const hasScopeMap = Object.keys(scopeMap).length > 0;

  		const kept: any[] = [];
  		for (const s of result.data) {
  			// Tenant-membership visibility (own requirement + module's)
  			// Super admins bypass the tenant requirement entirely.
  			if (
  				!isSuperAdmin &&
  				!satisfiesTenantRequirement(s.tenantRequirement, tenantId)
  			) {
  				continue;
  			}
  			if (
  				!isSuperAdmin &&
  				!satisfiesTenantRequirement(moduleReqs.get(s.moduleId), tenantId)
  			) {
  				continue;
  			}

  			// Permission-based visibility
  			if (hasScopeMap) {
  				const visPerms = s.visibleToPermissions as Array<{
  					resource: string;
  					action: string;
  					scope?: "own" | "tenant" | "all";
  				}> | null;
  				if (visPerms?.length) {
  					const allowed = visPerms.every((req) =>
  						this.scopeSatisfies(scopeMap[req.resource] ?? [], req.scope),
  					);
  					if (!allowed) continue;
  				}
  			}

  			// Tier + feature gating (features resolve per tenant; super admin
  			// bypasses). Only when the request carries an auth context — the
  			// unguarded list endpoint serves raw rows and the front filters by
  			// the user's /users/me features + permissions.
  			if (hasScopeMap && this.capability && !(await this.capability.canAccess(s))) {
  				continue;
  			}

  			// Inverse feature gate — screens carrying meta.hiddenWhenFeature are
  			// hidden when the feature is ENABLED (e.g. the default-menu screen
  			// when multi-menu is on). Same context rule as above.
  			const hiddenWhen = (s.meta as { hiddenWhenFeature?: string } | null)
  				?.hiddenWhenFeature;
  			if (
  				hiddenWhen &&
  				hasScopeMap &&
  				this.capability &&
  				(await this.capability.isFeatureEnabled(hiddenWhen))
  			) {
  				continue;
  			}

  			kept.push(s);
  		}
  		result.data = kept;

  		return result;
  	}

      	/**
      	 * True when the user's scopes satisfy a required visibility scope.
      	 * Scopes are hierarchical: "all" ⊇ "tenant" ⊇ "own" (matches the
      	 * frontend checkComponentPermission) — a super admin with "all" still
      	 * sees screens marked scope "tenant".
      	 */
      	private scopeSatisfies(
      		userScopes: string[],
      		required?: "own" | "tenant" | "all",
      	): boolean {
      		if (userScopes.length === 0) return false;
      		if (!required || required === "own") return true;
      		if (required === "all") return userScopes.includes("all");
      		return userScopes.includes("all") || userScopes.includes("tenant");
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
    			const tenantId = this.requestContext?.getEffectiveTenantId();
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
    			const hasAll = visPerms.every((req) =>
    				this.scopeSatisfies(scopeMap[req.resource] ?? [], req.scope),
    			);
    			if (!hasAll)
    				return new ForbiddenDto("errors.forbidden").details({
    					reason: "screen_visibility",
    					requiredPermissions: visPerms,
    				});
    		}

    // 1.6 Tier + feature gating (mirrors findMany — deep links must not
    // bypass the module's requiredTier/requiresFeature)
    if (this.capability && !(await this.capability.canAccess(screen))) {
      return new ForbiddenDto("errors.forbidden").details({
        reason: "screen_required_tier",
        required: screen.requiredTier ?? screen.requiresFeature ?? null,
      });
    }

    // 2. Load screen context (optional)
    const context = this.screenContextsRepo
      ? await this.screenContextsRepo.selectOne(
          eq(screenContexts.screenId, screenId) as SQL,
        )
      : null;

    // 3. Load the root component the screen mounts — screens now point at
    // a component directly (screen_widgets is gone).
    const root = screen.componentId
      ? await this.componentsRepo?.selectOneById(screen.componentId)
      : null;

    return {
      screen,
      context: context ? { params: context.params } : null,
      root: root ?? null,
    };
  }

	/**
	 * Components used on a screen — the screen's root component plus,
	 * recursively, every component it references via component_ref elements
	 * (layout → grid → tables/forms → sections …). Deduplicated, ordered
	 * breadth-first (root component first).
	 */
	async findScreenComponents(screenId: number) {
		const screen = await this.repo.selectOneById(screenId);
		if (!screen || !this.componentsRepo) return [];

		const seedIds = screen.componentId ? [screen.componentId] : [];
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
	 * Component tree of a screen — the screen's root component plus,
	 * recursively, every component it references via component_ref elements
	 * (layout → grid → tables/forms → sections …).
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

		const seedIds = screen.componentId ? [screen.componentId] : [];
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
}
