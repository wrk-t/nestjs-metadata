import { BadRequestDto, ForbiddenDto, NotFoundDto } from "@wrk-t/ts-exc";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import {
  AccessControlService,
  RequestContext,
  ITranslationService,
} from "@wrk-t/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { archComponents } from "../schemas";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { ComponentsPgRepository } from "../repositories/components.pg.repository";
import type {
  TBlueprintRow,
  TComponentRenderData,
  TComponentRow,
  TElementRow,
} from "../repositories/components.pg.repository";
import { mergeDelta } from "./component-delta";
import type {
  IComponentRenderResponse,
  IRenderedComponent,
  IRenderedElement,
} from "./components.types";
import type { IPermissionVisibility } from "../schemas";

// ──────────────────────────────────────────────────────────────────
// ComponentsService — unified render pipeline
// ──────────────────────────────────────────────────────────────────
//
// Replaces the separate FormsService.getFormRender() and
// TablesService.getTableRender() with a single getRender() that
// works for any component type.

@Injectable()
export class ComponentsService extends MetadataBaseService<
  typeof archComponents,
  ComponentsPgRepository,
  number
> {
  logger = new Logger(ComponentsService.name);

  constructor(
    repo: ComponentsPgRepository,
    @Optional() private readonly access?: AccessControlService,
    @Optional()
    @Inject(TRANSLATION_SERVICE)
    readonly translationService?: ITranslationService,
    @Optional() requestContext?: RequestContext,
  ) {
    super(repo, requestContext, translationService);
  }

  // ── Guards ─────────────────────────────────────────────────────

  protected override guardCreate(
    data: typeof archComponents.$inferInsert,
  ): BadRequestDto | ForbiddenDto | undefined {
    const isAllTenants = this.requestContext
      ?.getScopesForResource("tenants")
      .includes("all");

    if (!isAllTenants) {
      const userTenantId = this.requestContext?.getTenantId();
      if (!userTenantId) {
        return new ForbiddenDto(
          "You must belong to a tenant to create a component",
        );
      }
      if (
        data.tenantId !== undefined &&
        data.tenantId !== null &&
        data.tenantId !== userTenantId
      ) {
        return new ForbiddenDto(
          "Only users with full tenant access can assign a component to a different tenant",
        );
      }
      data.tenantId = userTenantId;
    }
  }

  protected override guardUpdate(
    _id: number,
    existing: typeof archComponents.$inferSelect,
    data: Partial<typeof archComponents.$inferInsert>,
  ): ForbiddenDto | undefined {
    const accessErr = this.access?.guardResourceAccess("components", existing);
    if (accessErr) return accessErr as any;

    if (data.tenantId !== undefined && data.tenantId !== existing.tenantId) {
      return this.access?.requireScope("tenants", "all") as any;
    }
  }

  protected override guardDelete(
    _id: number,
    _existing: typeof archComponents.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("components", "all") as any;
  }

  protected override guardRecover(
    _id: number,
    _existing: typeof archComponents.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("components", "all") as any;
  }

  // ── Render ─────────────────────────────────────────────────────

  /**
   * Resolve a component instance into a frontend-ready render tree.
   *
   * This is the unified replacement for getFormRender() and getTableRender().
   * It works for any component type — tables, forms, pages, sections.
   *
   * @param componentId — the component instance to render
   * @param options — tenantId, locale, context for param resolution
   * @param depth — internal recursion guard (prevents infinite loops)
   */
  async getRender(
    componentId: number,
    options?: {
      tenantId?: string | null;
      locale?: string;
      context?: Record<string, unknown>;
      depth?: number;
    },
  ): Promise<IComponentRenderResponse | NotFoundDto> {
    const depth = options?.depth ?? 0;
    if (depth > 8) {
      return new BadRequestDto("Component nesting too deep (max 8 levels)");
    }

	    const locale = options?.locale ?? this.requestContext?.getLocale() ?? "en";
	    // Explicit header wins; otherwise the authenticated request's tenant
	    // context (x-workspace: org:<tenantId> — what the browser sends) is
	    // used, so tenant-scoped deltas apply on real renders.
	    const tenantId =
	      options?.tenantId ?? this.requestContext?.getTenantId() ?? null;
	    const ctx = options?.context ?? {};

    const data = await this.resolveComponentData(
      componentId,
      tenantId ?? undefined,
    );
    if (!data) return new NotFoundDto("Component not found");

    // Resolve component_ref elements so their referenced component
    // is available at render time.
    await this.resolveRefs(data, tenantId, depth);

	    // Build the rendered component
	    const rendered = this.toRenderedComponent(data, ctx);

	    // Resolve translations
    if (this.translationService) {
      this.logger.log(
        `getRender: resolving translations for component ${componentId} (locale=${locale}, tenantId=${tenantId})`,
      );
      const translated = await this.translationService.resolveTranslations(
        rendered,
        locale,
        tenantId,
      );
      this.logger.log(
        `getRender: translations resolved for component ${componentId}`,
      );
      return {
        component: translated as IRenderedComponent,
      };
    }

    this.logger.warn(
      `getRender: no translationService available for component ${componentId}`,
    );
    return { component: rendered };
  }

	  // ── Private helpers ────────────────────────────────────────────

	  /**
	   * Resolve a component id to its render data, applying the tenant's
	   * delta when one exists.
	   *
	   * Two ways a component can be customized:
	   *   1. the row itself is a delta (editOps set, baseComponentId → base)
	   *   2. a tenant delta row targets the base (baseComponentId = id)
	   *
	   * Returns the MERGED component + elements — the delta is applied at
	   * read time; nothing is materialized.
	   */
	  async resolveComponentData(
	    componentId: number,
	    tenantId?: string | null,
	  ): Promise<TComponentRenderData | null> {
	    const raw = await this.repo.getRenderData(
	      componentId,
	      tenantId ?? undefined,
	    );
	    if (!raw) return null;

	    const isDirect = !!raw.component.editOps?.length;
	    let delta: TComponentRow | null = isDirect ? raw.component : null;
	    let baseData: TComponentRenderData = raw;

	    if (isDirect) {
	      const baseId = raw.component.baseComponentId;
	      if (baseId == null) return raw;
	      const baseRow = await this.repo.getRenderData(baseId, tenantId ?? undefined);
	      if (!baseRow) return raw;
	      baseData = baseRow;
	    } else {
	      delta = await this.repo.findDeltaFor(componentId, tenantId ?? undefined);
	    }

	    if (!delta || !delta.editOps?.length) return raw;

	    const identitySource = isDirect ? raw.component : baseData.component;
	    const merged = mergeDelta(
	      {
	        identity: { ...identitySource },
	        config: (baseData.component.config ?? {}) as Record<string, unknown>,
	        elements: baseData.elements,
	      },
	      delta.editOps,
	    );

	    const component = {
	      ...identitySource,
	      ...merged.identity,
	      id: componentId,
	      blueprintId: baseData.component.blueprintId,
	      config: merged.config,
	      editOps: delta.editOps,
	      baseComponentId: isDirect ? raw.component.baseComponentId : null,
	    } as TComponentRow;

	    const elements = merged.elements.map((el) => ({
	      ...el,
	      componentId,
	    })) as TElementRow[];

	    return { component, blueprint: baseData.blueprint, elements };
	  }

  /**
   * Resolve component_ref and renderer elements by fetching their
   * referenced data.
   *
   * component_ref chains are walked iteratively (breadth-first) so
   * arbitrarily deep trees resolve — e.g. page → tabs → form → section
   * (3 levels). A visited set guards against reference cycles and
   * diamond shapes, and the depth cap mirrors getRender's own guard.
   */
  private async resolveRefs(
    data: TComponentRenderData,
    tenantId: string | null | undefined,
    _depth: number,
  ): Promise<void> {
    const MAX_REF_DEPTH = 8;
    const visited = new Set<number>();

    // Elements whose component_ref children need resolving at this level.
    // Each iteration replaces this with the elements of the components
    // resolved in the previous iteration.
    let frontier: TElementRow[] = data.elements;

    for (let depth = 0; depth < MAX_REF_DEPTH; depth++) {
      const compRefEls = frontier.filter(
        (e) => e.elementType === "component_ref" && e.referencedComponentId,
      );
      if (compRefEls.length === 0) break;

      const ids = [
        ...new Set(compRefEls.map((e) => e.referencedComponentId!)),
      ].filter((id) => !visited.has(id));
      if (ids.length === 0) break;

	      const refs = await this.repo.findComponentsByIds(ids);
	      const batchData = await this.repo.batchResolveRefs(
	        ids,
	        tenantId ?? undefined,
	      );
	      const refMap = new Map(refs.map((r) => [r.id, r]));

	      // ── Delta-aware refs ──────────────────────────────────
	      // A referenced component can be customized two ways:
	      //   1. the row itself is a delta (editOps) — merge vs its base
	      //   2. a tenant delta row targets the base (baseComponentId = id)
	      const tenantDeltas = await this.repo.findDeltasFor(
	        ids,
	        tenantId ?? undefined,
	      );
	      const directBaseIds = [
	        ...new Set(
	          compRefEls
	            .filter(
	              (e) =>
	                (refMap.get(e.referencedComponentId!) as TComponentRow | undefined)
	                  ?.editOps?.length,
	            )
	            .map((e) => {
	              const c = refMap.get(e.referencedComponentId!) as TComponentRow;
	              return c.baseComponentId;
	            })
	            .filter((id): id is number => id != null),
	        ),
	      ];
	      const baseComps =
	        directBaseIds.length > 0
	          ? await this.repo.findComponentsByIds(directBaseIds)
	          : [];
	      const baseCompMap = new Map(baseComps.map((c) => [c.id, c]));
	      const baseElementsMap =
	        directBaseIds.length > 0
	          ? await this.repo.batchResolveRefs(directBaseIds, tenantId ?? undefined)
	          : new Map<number, { blueprint: TBlueprintRow; elements: TElementRow[] }>();

	      const next: TElementRow[] = [];
	      for (const el of compRefEls) {
	        const refId = el.referencedComponentId!;
	        const refComp = refMap.get(refId) as TComponentRow | undefined;
	        const refData = batchData.get(refId);
	        const isDirect = !!refComp?.editOps?.length;
	        const delta = isDirect ? refComp : (tenantDeltas.get(refId) ?? null);

	        let refElements = refData?.elements ?? [];
	        let refBlueprint = refData?.blueprint ?? null;
	        let refMerged = refComp as TComponentRow | null | undefined;

	        if (delta?.editOps?.length && refComp) {
	          const baseId = isDirect ? refComp.baseComponentId : refComp.id;
	          const baseComp = isDirect
	            ? (baseId != null ? baseCompMap.get(baseId) : undefined) ?? refComp
	            : refComp;
	          const baseEls =
	            isDirect && baseId != null
	              ? (baseElementsMap.get(baseId)?.elements ?? refElements)
	              : refElements;
	          if (isDirect && baseId != null) {
	            refBlueprint =
	              baseElementsMap.get(baseId)?.blueprint ?? refBlueprint;
	          }
	          const merged = mergeDelta(
	            {
	              identity: { ...refComp },
	              config: (baseComp.config ?? {}) as Record<string, unknown>,
	              elements: baseEls,
	            },
	            delta.editOps,
	          );
	          refElements = merged.elements as TElementRow[];
	          // The referenced component itself also changes: identity + config
	          // ops apply to it, so the renderer sees the merged values.
	          refMerged = {
	            ...refComp,
	            ...merged.identity,
	            config: merged.config,
	          } as TComponentRow;
	        }

	        (el as any).referencedComponent = refMerged ?? null;
	        (el as any).referencedBlueprint = refBlueprint;
	        (el as any).referencedElements = refElements;
	        next.push(...refElements);
	      }

	      for (const id of ids) visited.add(id);

	      // Next level: all elements of the just-resolved components
	      frontier = next;
    }

    // ── Renderer blueprints ───────────────────────────────
    const rendererEls = data.elements.filter(
      (e) => e.elementType === "renderer" && e.rendererBlueprintId,
    );
    if (rendererEls.length > 0) {
      const ids = rendererEls.map((e) => e.rendererBlueprintId!);
      const refs = await this.repo.findBlueprintsByIds(ids);
      const refMap = new Map(refs.map((r) => [r.id, r]));
      for (const el of rendererEls) {
        (el as any).rendererBlueprint =
          refMap.get(el.rendererBlueprintId!) ?? null;
      }
    }
  }

  /**
   * Convert raw DB data into the rendered component shape.
   */
  private toRenderedComponent(
    data: TComponentRenderData,
    context: Record<string, unknown>,
  ): IRenderedComponent {
    const { component, blueprint } = data;

    // Group elements by slot
    const slotsFilled: Record<string, IRenderedElement[]> = {};
    for (const el of data.elements) {
      if (!el.isActive) continue;
      const slot = el.slotName || "__ungrouped__";
      if (!slotsFilled[slot]) slotsFilled[slot] = [];
      slotsFilled[slot].push(this.toRenderedElement(el));
    }

    return {
      id: component.id,
      blueprintId: blueprint.id,
      blueprintName: blueprint.name,
      name: component.name,
      displayName: component.displayName,
      description: component.description,
      icon: component.icon,
      category: component.category,
      config: component.config,
      pathPattern: component.pathPattern,
      slots: blueprint.slots,
      overridable: blueprint.overridable,
      contract: blueprint.contract,
      slotsFilled,
      visibleToPermissions: component.visibleToPermissions as
        | IPermissionVisibility[]
        | null
        | undefined,
      tenantId: component.tenantId,
      isActive: component.isActive,
      isSystem: component.isSystem,
      meta: component.meta,
    };
  }

  /**
   * Convert a single element row into the rendered element shape.
   */
  private toRenderedElement(el: TElementRow): IRenderedElement {
    const rawGrid = (el as any).grid;
    const grid =
      typeof rawGrid === "string"
        ? (JSON.parse(rawGrid) as IRenderedElement["grid"])
        : (rawGrid as IRenderedElement["grid"] | null | undefined);

    const base: IRenderedElement = {
      id: el.id,
      slotName: el.slotName,
      elementType: el.elementType as IRenderedElement["elementType"],
      displayOrder: el.displayOrder,
      isActive: el.isActive,
      meta: el.meta,
      grid: grid ?? null,
    };

    switch (el.elementType) {
      case "field": {
        const fd = (el as any).fieldDefinition;
        const uic = (el as any).uiComponent;
        // Drizzle's json type may return a string — normalise to object
        const rawOverrides = el.overrides;
        const ov =
          typeof rawOverrides === "string"
            ? (JSON.parse(rawOverrides) as Record<string, unknown>)
            : (rawOverrides as Record<string, unknown> | null | undefined);
        return {
          ...base,
          fieldDefinitionId: el.fieldDefinitionId,
          uiComponentId: el.uiComponentId,
          name: ov?.name ?? fd?.name ?? null,
          type: fd?.type ?? null,
          label: ov?.displayName ?? fd?.displayName ?? null,
          overrides: ov,
        };
      }

      case "component_ref": {
        const ref = (el as any).referencedComponent;
        const refBp = (el as any).referencedBlueprint;
        const refEls = (el as any).referencedElements as
          TElementRow[] | undefined;

        // Build slotsFilled from the referenced component's elements
        const refSlotsFilled: Record<string, IRenderedElement[]> = {};
        if (refEls) {
          for (const rel of refEls) {
            if (!rel.isActive) continue;
            const slot = rel.slotName || "__ungrouped__";
            if (!refSlotsFilled[slot]) refSlotsFilled[slot] = [];
            refSlotsFilled[slot].push(this.toRenderedElement(rel));
          }
        }

        return {
          ...base,
          referencedComponent: ref
            ? {
                id: ref.id,
                blueprintId: ref.blueprintId,
                blueprintName: refBp?.name ?? "",
                name: ref.name,
                displayName: ref.displayName,
                description: ref.description,
                icon: ref.icon,
                category: ref.category,
                config: ref.config,
                pathPattern: ref.pathPattern,
                slots: refBp?.slots ?? [],
                overridable: refBp?.overridable ?? null,
                contract: refBp?.contract ?? null,
                slotsFilled: refSlotsFilled,
                visibleToPermissions: ref.visibleToPermissions as
                  | IPermissionVisibility[]
                  | null
                  | undefined,
                tenantId: ref.tenantId,
                isActive: ref.isActive,
                isSystem: ref.isSystem,
                meta: ref.meta,
              }
            : null,
          paramBindings: el.paramBindings as Record<string, unknown> | null,
        };
      }

      case "renderer": {
        const bp = (el as any).rendererBlueprint;
        return {
          ...base,
          rendererBlueprintId: el.rendererBlueprintId,
          rendererConfig: el.rendererConfig,
          // If the renderer has a blueprint, provide its contract
          ...(bp
            ? {
                overrides: bp.contract as Record<string, unknown> | null,
              }
            : {}),
        };
      }

	      default:
	        return base;
	    }
	  }
}
