import {
  BadRequestDto,
  ForbiddenDto,
  NotFoundDto,
} from "@esmaeel_emadi/ts-exc";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import type { TScope, ScopeMap } from "@esmaeel_emadi/nestjs-core";
import {
  AccessControlService,
  RequestContext,
  ITranslationService,
} from "@esmaeel_emadi/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { fieldDefinitions, tableColumnInstances, tables } from "../schemas";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { TablesPgRepository } from "../repositories/tables.pg.repository";
import type { ITableRenderResponse } from "../modules/tables/types";

@Injectable()
export class TablesService extends MetadataBaseService<
  typeof tables,
  TablesPgRepository
> {
  logger = new Logger(TablesService.name);

  constructor(
    repo: TablesPgRepository,
    @Optional() private readonly access?: AccessControlService,
    @Optional()
    @Inject(TRANSLATION_SERVICE)
    readonly translationService?: ITranslationService,
    @Optional() requestContext?: RequestContext,
  ) {
    super(repo, requestContext, translationService);
  }

  protected override guardCreate(
    data: typeof tables.$inferInsert,
  ): BadRequestDto | ForbiddenDto | undefined {
    const isAllTenants = this.requestContext
      ?.getScopesForResource("tenants")
      .includes("all");

    if (!isAllTenants) {
      const userTenantId = this.requestContext?.getTenantId();
      if (!userTenantId) {
        return new ForbiddenDto(
          "You must belong to a tenant to create a table",
        );
      }
      if (
        data.tenantId !== undefined &&
        data.tenantId !== null &&
        data.tenantId !== userTenantId
      ) {
        return new ForbiddenDto(
          "Only users with full tenant access can assign a table to a different tenant",
        );
      }
      data.tenantId = userTenantId;
    }
  }

  protected override guardUpdate(
    _id: string,
    existing: typeof tables.$inferSelect,
    data: Partial<typeof tables.$inferInsert>,
  ): ForbiddenDto | undefined {
    const accessErr = this.access?.guardResourceAccess("tables", existing);
    if (accessErr) return accessErr as any;

    if (data.tenantId !== undefined && data.tenantId !== existing.tenantId) {
      return this.access?.requireScope("tenants", "all") as any;
    }
  }

  protected override guardDelete(
    _id: string,
    _existing: typeof tables.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("tables", "all") as any;
  }

  protected override guardRecover(
    _id: string,
    _existing: typeof tables.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access?.requireScope("tables", "all") as any;
  }

  async getTableRender(
    tableId: string,
    options?: {
      locale?: string;
      tenantId?: string | null;
      roleNames?: string[];
      scopeMap?: ScopeMap;
    },
  ): Promise<ITableRenderResponse | NotFoundDto> {
    const locale = options?.locale ?? "en";
    const currentTenantId = options?.tenantId;
    const userRoles = options?.roleNames ?? [];
    const scopeMap = options?.scopeMap ?? {};

    const table = await this.repo.selectOneById(tableId);
    if (!table) return new NotFoundDto();

    const columnRows = await this.repo.findColumnsByTableId(
      tableId,
      currentTenantId,
    );

    const renderTable = this.toRenderTable(table);
    const renderColumns = columnRows
      .filter((row: any) => {
        const fd = row.field_definitions;
        if (!fd) return true;
        return !this.shouldHideColumn(fd, userRoles, scopeMap);
      })
      .map((row: any) =>
        this.toRenderColumn(row.table_column_instances, row.field_definitions),
      );

    const response: ITableRenderResponse = {
      table: renderTable,
      columns: renderColumns,
    };

    if (this.translationService) {
      return this.translationService.resolveTranslations(
        response,
        locale,
        currentTenantId,
      ) as Promise<ITableRenderResponse>;
    }

    return response;
  }

  // ── Visibility ──

  private shouldHideColumn(
    fd: typeof fieldDefinitions.$inferSelect,
    userRoles: string[],
    scopeMap: ScopeMap = {},
  ): boolean {
    if (userRoles.includes("*skip-visibility-check*")) return false;

    if (fd.visibleToPermissions?.length) {
      const hasAll = fd.visibleToPermissions.every((req) =>
        this.userHasPermissionScope(
          scopeMap as any,
          req.resource,
          req.action,
          req.scope,
        ),
      );
      if (!hasAll) return true;
    } else if (
      fd.visibleToRoles?.length &&
      !fd.visibleToRoles.some((r) => userRoles.includes(r))
    ) {
      return true;
    }

    return false;
  }

  private userHasPermissionScope(
    scopeMap: any,
    resource: string,
    action: string,
    requiredScope?: "own" | "tenant" | "all",
  ): boolean {
    const compositeKey = `${resource}:${action}`;
    const userScopes = scopeMap[compositeKey] ?? scopeMap[resource];
    if (!userScopes || userScopes.length === 0) return false;
    if (!requiredScope) return true;

    const SCOPE_LEVEL: Record<TScope, number> = { own: 0, tenant: 1, all: 2 };
    const requiredLevel = SCOPE_LEVEL[requiredScope];
    return userScopes.some(
      (s: any) => SCOPE_LEVEL[s as TScope] >= requiredLevel,
    );
  }

  // ── Helpers ──

  private toRenderTable(
    table: Record<string, any>,
  ): ITableRenderResponse["table"] {
    return {
      id: table.id,
      name: table.name,
      entityId: table.entityId ?? null,
      entity: table.entity,
      title: table.title,
      description: table.description ?? null,
      datasource: table.datasource,
      selection: table.selection ?? null,
      rowActions: table.rowActions,
      toolbarActions: table.toolbarActions,
      settings: table.settings,
      expandable: table.expandable ?? null,
      subTable: table.subTable ?? null,
      emptyState: table.emptyState ?? null,
      onRowClick: table.onRowClick ?? null,
      tenantId: table.tenantId,
      isActive: table.isActive ?? true,
      isSystem: table.isSystem ?? false,
      category: table.category ?? null,
      displayOrder: table.displayOrder ?? null,
      meta: table.meta ?? null,
      createdAt: table.createdAt?.toISOString?.() ?? table.createdAt,
      updatedAt: table.updatedAt?.toISOString?.() ?? table.updatedAt,
      deletedAt: table.deletedAt?.toISOString?.() ?? null,
    };
  }

  private toRenderColumn(
    col: Record<string, any>,
    fd?: Record<string, any> | null,
  ): ITableRenderResponse["columns"][number] {
    return {
      id: col.id,
      tableMetadataId: col.tableMetadataId,
      fieldDefinitionId: col.fieldDefinitionId ?? null,
      uiTemplateId: col.uiTemplateId ?? null,
      name: (col.fieldOverrides as any)?.name ?? fd?.name ?? null,
      displayName: col.fieldOverrides?.displayName ?? fd?.displayName ?? null,
      description: col.fieldOverrides?.description ?? fd?.description ?? null,
      fieldOverrides: col.fieldOverrides ?? null,
      uiOverrides: col.uiOverrides ?? null,
      columnConfig: col.columnConfig ?? null,
      instanceConfig: col.instanceConfig ?? null,
      displayOrder: col.displayOrder ?? null,
      fixedPosition: col.fixedPosition ?? null,
      columnGroup: col.columnGroup ?? null,
      isActive: col.isActive ?? null,
      isSystem: col.isSystem ?? null,
      meta: col.meta ?? null,
    };
  }
}
