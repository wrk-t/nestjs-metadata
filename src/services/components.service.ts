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
  TComponentRenderData,
  TElementRow,
} from "../repositories/components.pg.repository";
import type {
  IComponentRenderResponse,
  IRenderedComponent,
  IRenderedElement,
} from "./components.types";

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
  ComponentsPgRepository
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
    _id: string,
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
    _id: string,
    _existing: typeof archComponents.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("components", "all") as any;
  }

  protected override guardRecover(
    _id: string,
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
    componentId: string,
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

    const locale = options?.locale ?? "en";
    const tenantId = options?.tenantId;
    const ctx = options?.context ?? {};

    const data = await this.repo.getRenderData(
      componentId,
      tenantId ?? undefined,
    );
    if (!data) return new NotFoundDto("Component not found");

    // Resolve component_ref elements so their referenced component
    // is available at render time.
    await this.resolveRefs(data, tenantId, depth);

    // Build the rendered component
    const rendered = this.toRenderedComponent(data, ctx);

    // Apply tenant overrides
    this.applyOverrides(rendered, data.overrides, data.blueprint);

    // Resolve translations
    if (this.translationService) {
      return {
        component: (await this.translationService.resolveTranslations(
          rendered,
          locale,
          tenantId,
        )) as IRenderedComponent,
      };
    }

    return { component: rendered };
  }

  // ── Private helpers ────────────────────────────────────────────

  /**
   * Resolve component_ref and renderer elements by fetching their
   * referenced data. Called only one level deep at a time to avoid
   * N+1 on deeply nested trees.
   */
  private async resolveRefs(
    data: TComponentRenderData,
    tenantId: string | null | undefined,
    _depth: number,
  ): Promise<void> {
    // ── First level: resolve direct children ──────────────
    const compRefEls = data.elements.filter(
      (e) => e.elementType === "component_ref" && e.referencedComponentId,
    );
    if (compRefEls.length > 0) {
      const ids = compRefEls.map((e) => e.referencedComponentId!);
      const refs = await this.repo.findComponentsByIds(ids);
      const batchData = await this.repo.batchResolveRefs(
        ids,
        tenantId ?? undefined,
      );
      const refMap = new Map(refs.map((r) => [r.id, r]));
      for (const el of compRefEls) {
        const refComp = refMap.get(el.referencedComponentId!);
        const refData = batchData.get(el.referencedComponentId!);
        (el as any).referencedComponent = refComp ?? null;
        (el as any).referencedBlueprint = refData?.blueprint ?? null;
        (el as any).referencedElements = refData?.elements ?? [];
      }

      // ── Second level: resolve children of resolved components ─
      const grandchildIds: string[] = [];
      for (const [_id, refData] of batchData) {
        for (const el of refData.elements) {
          if (el.elementType === "component_ref" && el.referencedComponentId) {
            grandchildIds.push(el.referencedComponentId!);
          }
        }
      }
      if (grandchildIds.length > 0) {
        const gcRefs = await this.repo.findComponentsByIds(grandchildIds);
        const gcBatch = await this.repo.batchResolveRefs(
          grandchildIds,
          tenantId ?? undefined,
        );
        const gcRefMap = new Map(gcRefs.map((r) => [r.id, r]));

        // Attach resolved data to the grandchild elements
        for (const [_id, refData] of batchData) {
          for (const el of refData.elements) {
            if (
              el.elementType === "component_ref" &&
              el.referencedComponentId
            ) {
              const gc = gcRefMap.get(el.referencedComponentId!);
              const gcData = gcBatch.get(el.referencedComponentId!);
              (el as any).referencedComponent = gc ?? null;
              (el as any).referencedBlueprint = gcData?.blueprint ?? null;
              (el as any).referencedElements = gcData?.elements ?? [];
            }
          }
        }
      }
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
    const base: IRenderedElement = {
      id: el.id,
      slotName: el.slotName,
      elementType: el.elementType as IRenderedElement["elementType"],
      displayOrder: el.displayOrder,
      isActive: el.isActive,
      meta: el.meta,
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

  /**
   * Merge tenant overrides into the rendered component.
   * Only paths declared in the blueprint's overridable/slot.overridable
   * are applied — but enforcement happens at write time, so here we
   * just apply whatever's present.
   */
  private applyOverrides(
    rendered: IRenderedComponent,
    overrideRows: TComponentRenderData["overrides"],
    blueprint: TComponentRenderData["blueprint"],
  ): void {
    if (!overrideRows || overrideRows.length === 0) return;

    const compOverride = overrideRows.find((o) => !o.elementId);
    if (compOverride?.overrides) {
      const ov = compOverride.overrides as Record<string, unknown>;
      if (typeof ov.displayName === "string") {
        rendered.displayName = ov.displayName;
      }
      if (ov.config) {
        rendered.config = {
          ...(rendered.config ?? {}),
          ...(ov.config as Record<string, unknown>),
        };
      }
    }

    // Element-level overrides
    const elOverrides = overrideRows.filter((o) => o.elementId);
    if (elOverrides.length === 0) return;

    const elOvMap = new Map(
      elOverrides.map((o) => [o.elementId!, o.overrides]),
    );

    for (const slot of Object.values(rendered.slotsFilled)) {
      for (const el of slot) {
        const ov = elOvMap.get(el.id);
        if (ov) {
          el.overrides = {
            ...(el.overrides ?? {}),
            ...(ov as Record<string, unknown>),
          };
        }
      }
    }
  }
}
