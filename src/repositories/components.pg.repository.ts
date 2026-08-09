import { Injectable, Inject, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { and, asc, eq, inArray, isNull, or, SQL } from "drizzle-orm";
import { Repository } from "@wrk-t/nestjs-core";
import type { ILogService } from "@wrk-t/nestjs-core";
import {
  archComponents,
  archComponentBlueprints,
  archComponentElements,
  archComponentOverrides,
} from "../schemas";

// ──────────────────────────────────────────────────────────────────
// Composite types for the render query
// ──────────────────────────────────────────────────────────────────

export type TComponentRenderData = NonNullable<
  Awaited<ReturnType<ComponentsPgRepository["getRenderData"]>>
>;

export type TBlueprintRow = typeof archComponentBlueprints.$inferSelect;

export type TComponentRow = typeof archComponents.$inferSelect;

export type TElementRow = typeof archComponentElements.$inferSelect & {
  fieldDefinition?:
    | typeof import("../schemas/fieldDefinitions").fieldDefinitions.$inferSelect
    | null;
  uiComponent?:
    typeof import("../schemas/uiComponents").uiComponents.$inferSelect | null;
  // Resolved at service level:
  referencedComponent?: TComponentRow | null;
  rendererBlueprint?: TBlueprintRow | null;
};

export type TOverrideRow = typeof archComponentOverrides.$inferSelect;

// ──────────────────────────────────────────────────────────────────
// Repository
// ──────────────────────────────────────────────────────────────────

@Injectable()
export class ComponentsPgRepository extends Repository<
  any,
  typeof archComponents
> {
  protected override tableName = "archComponents";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return this.resolveScopeFilter(condition, {
      tenant: this.table.tenantId,
    });
  }

  protected override filterableFields = {
    isActive: (value: boolean) => eq(archComponents.isActive, value),
    isSystem: (value: boolean) => eq(archComponents.isSystem, value),
    category: (value: string) => eq(archComponents.category, value),
    tenantId: (value: string) => eq(archComponents.tenantId, value),
  };

  protected override searchableColumns: any = ["name", "displayName"];

  protected override defaultSortColumn: any = "createdAt";

  protected override includeMap = {
    blueprint: {
      blueprint: true,
    },
    elements: {
      elements: {
        with: {
          fieldDefinition: true,
          uiComponent: true,
        },
      },
    },
  };

  // ── Render data ───────────────────────────────────────────────

  /**
   * Fetch everything needed to render a component: the component itself,
   * its blueprint, its elements (with field defs and UI components), and
   * any tenant-level overrides.
   */
  async getRenderData(
    componentId: string,
    tenantId?: string,
  ): Promise<{
    component: TComponentRow;
    blueprint: TBlueprintRow;
    elements: TElementRow[];
    overrides: TOverrideRow[];
  } | null> {
    return await this.execute(async (db) => {
      const component = await db.query.archComponents.findFirst({
        where: eq(archComponents.id, componentId),
      });
      if (!component) return null;

      const blueprint = await db.query.archComponentBlueprints.findFirst({
        where: eq(archComponentBlueprints.id, component.blueprintId),
      });
      if (!blueprint) return null;

      // Elements: system + tenant-specific
      const elementsWhere = tenantId
        ? or(
            isNull(archComponentElements.tenantId),
            eq(archComponentElements.tenantId, tenantId),
          )
        : isNull(archComponentElements.tenantId);

      const elements = (await db
        .select()
        .from(archComponentElements)
        .where(
          and(
            eq(archComponentElements.componentId, componentId),
            elementsWhere,
          ),
        )
        .orderBy(
          asc(archComponentElements.slotName),
          asc(archComponentElements.displayOrder),
        )) as TElementRow[];

      // Resolve field definitions and UI components for field-type elements
      const fieldDefIds = elements
        .filter((e) => e.elementType === "field" && e.fieldDefinitionId)
        .map((e) => e.fieldDefinitionId!);
      const uiCompIds = elements
        .filter((e) => e.uiComponentId)
        .map((e) => e.uiComponentId!);

      // Batch-fetch referenced resources
      if (fieldDefIds.length > 0) {
        const { fieldDefinitions } =
          await import("../schemas/fieldDefinitions");
        const fds = await db
          .select()
          .from(fieldDefinitions)
          .where(inArray(fieldDefinitions.id, fieldDefIds));
        const fdMap = new Map(
          fds.map((fd: (typeof fds)[number]) => [fd.id, fd]),
        );
        for (const el of elements) {
          if (el.fieldDefinitionId) {
            (el as any).fieldDefinition =
              fdMap.get(el.fieldDefinitionId) ?? null;
          }
        }
      }

      if (uiCompIds.length > 0) {
        const { uiComponents } = await import("../schemas/uiComponents");
        const uics = await db
          .select()
          .from(uiComponents)
          .where(inArray(uiComponents.id, uiCompIds));
        const uicMap = new Map(
          uics.map((uic: (typeof uics)[number]) => [uic.id, uic]),
        );
        for (const el of elements) {
          if (el.uiComponentId) {
            (el as any).uiComponent = uicMap.get(el.uiComponentId) ?? null;
          }
        }
      }

      // Overrides
      let overrides: TOverrideRow[] = [];
      if (tenantId) {
        overrides = await db
          .select()
          .from(archComponentOverrides)
          .where(
            and(
              eq(archComponentOverrides.componentId, componentId),
              eq(archComponentOverrides.tenantId, tenantId),
            ),
          );
      }

      return { component, blueprint, elements, overrides };
    }, "read");
  }

  // ── Blueprint helpers ──────────────────────────────────────────

  /**
   * Fetch a single blueprint by ID.
   */
  async findBlueprintById(id: string): Promise<TBlueprintRow | null> {
    return await this.execute(async (db) => {
      return (
        (await db.query.archComponentBlueprints.findFirst({
          where: eq(archComponentBlueprints.id, id),
        })) ?? null
      );
    }, "read");
  }

  /**
   * Fetch a single blueprint by name (e.g. "table", "screenLayoutGeneral").
   */
  async findBlueprintByName(name: string): Promise<TBlueprintRow | null> {
    return await this.execute(async (db) => {
      return (
        (await db.query.archComponentBlueprints.findFirst({
          where: eq(archComponentBlueprints.name, name),
        })) ?? null
      );
    }, "read");
  }

  /**
   * Insert arch component elements, ignoring rows whose CUID already
   * exists (idempotent — used by the metadata module bootstrap).
   */
  async insertElements(
    rows: (typeof archComponentElements.$inferInsert)[],
  ): Promise<void> {
    if (rows.length === 0) return;
    await this.execute(async (db) => {
      await db
        .insert(archComponentElements)
        .values(rows)
        .onConflictDoNothing();
    }, "create");
  }

  // ── Element resolution helpers ─────────────────────────────────

  /**
   * Batch-fetch referenced components (for component_ref elements).
   */
  async findComponentsByIds(ids: string[]): Promise<TComponentRow[]> {
    if (ids.length === 0) return [];
    return await this.execute(async (db) => {
      return await db
        .select()
        .from(archComponents)
        .where(inArray(archComponents.id, ids));
    }, "read");
  }

  /**
   * Batch-fetch renderer blueprints (for renderer elements).
   */
  async findBlueprintsByIds(ids: string[]): Promise<TBlueprintRow[]> {
    if (ids.length === 0) return [];
    return await this.execute(async (db) => {
      return await db
        .select()
        .from(archComponentBlueprints)
        .where(inArray(archComponentBlueprints.id, ids));
    }, "read");
  }

  async batchResolveRefs(
    componentIds: string[],
    tenantId?: string,
  ): Promise<
    Map<string, { blueprint: TBlueprintRow; elements: TElementRow[] }>
  > {
    const result = new Map<
      string,
      { blueprint: TBlueprintRow; elements: TElementRow[] }
    >();
    if (componentIds.length === 0) return result;

    return await this.execute(async (db) => {
      const comps = await db
        .select()
        .from(archComponents)
        .where(inArray(archComponents.id, componentIds));
      const bpIds = [
        ...new Set(comps.map((c: any) => c.blueprintId)),
      ] as string[];
      const bps =
        bpIds.length > 0
          ? await db
              .select()
              .from(archComponentBlueprints)
              .where(inArray(archComponentBlueprints.id, bpIds))
          : [];
      const bpMap = new Map(bps.map((bp: any) => [bp.id, bp]));

      const elementsWhere = tenantId
        ? or(
            isNull(archComponentElements.tenantId),
            eq(archComponentElements.tenantId, tenantId),
          )
        : isNull(archComponentElements.tenantId);

      const allElements = await db
        .select()
        .from(archComponentElements)
        .where(
          inArray(archComponentElements.componentId, componentIds),
          elementsWhere,
        )
        .orderBy(
          asc(archComponentElements.slotName),
          asc(archComponentElements.displayOrder),
        );

      // Resolve field definitions for sub-component elements
      const allFieldDefIds = allElements
        .filter((e: any) => e.elementType === "field" && e.fieldDefinitionId)
        .map((e: any) => e.fieldDefinitionId!);
      if (allFieldDefIds.length > 0) {
        const { fieldDefinitions } =
          await import("../schemas/fieldDefinitions");
        const fds = await db
          .select()
          .from(fieldDefinitions)
          .where(inArray(fieldDefinitions.id, allFieldDefIds));
        const fdMap = new Map(fds.map((fd: any) => [fd.id, fd]));
        for (const el of allElements) {
          if (el.fieldDefinitionId)
            (el as any).fieldDefinition =
              fdMap.get(el.fieldDefinitionId) ?? null;
        }
      }

      const elementsByComp = new Map<string, TElementRow[]>();
      for (const el of allElements) {
        const list = elementsByComp.get(el.componentId) || [];
        list.push(el as TElementRow);
        elementsByComp.set(el.componentId, list);
      }

      for (const comp of comps) {
        const bp = bpMap.get(comp.blueprintId);
        if (bp)
          result.set(comp.id, {
            blueprint: bp,
            elements: elementsByComp.get(comp.id) ?? [],
          } as any);
      }
      return result;
    }, "read");
  }

  constructor(
    @Optional() readonly eventEmitter: EventEmitter2,
    @InjectTransactionHost("MAIN_DB") readonly txHost: TransactionHost,
    @Optional() protected readonly logService?: ILogService,
    @Optional() protected readonly cls?: any,
  ) {
    super(archComponents, txHost, eventEmitter, logService, cls);
  }
}
