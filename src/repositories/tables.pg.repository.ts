import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { and, asc, eq, isNull, or, SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@esmaeel_emadi/nestjs-core";
import { tables } from "../schemas";
import { tableColumnInstances } from "../schemas";
import { fieldDefinitions } from "../schemas";

@Injectable()
export class TablesPgRepository extends Repository<any, typeof tables> {
  protected override tableName = "tables";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    // System-level tables (tenantId IS NULL) are visible to all tenants
    // Tenant-level tables are filtered by tenant scope
    if (condition) {
      return and(
        condition,
        or(
          isNull(this.table.tenantId),
          eq(this.table.tenantId, this.cls?.get<string>("tenantId") ?? ""),
        ),
      );
    }
    return or(
      isNull(this.table.tenantId),
      eq(this.table.tenantId, this.cls?.get<string>("tenantId") ?? ""),
    );
  }

  protected override filterableFields: Record<string, (value: any) => SQL> = {
    isActive: (value: boolean) => eq(tables.isActive, value),
    isSystem: (value: boolean) => eq(tables.isSystem, value),
    category: (value: string) => eq(tables.category, value),
    tenantId: (value: string) => eq(tables.tenantId, value),
  };

  protected override searchableColumns: any = ["name", "title"];
  protected override defaultSortColumn: any = "createdAt";
  protected override includeMap = {
    columns: {
      columns: true,
    },
  };

  constructor(
    @Optional() readonly eventEmitter: EventEmitter2,
    @InjectTransactionHost("MAIN_DB") readonly txHost: TransactionHost,
    @Optional() protected readonly logService?: ILogService,
    @Optional() protected readonly cls?: ClsService,
  ) {
    super(tables, txHost, eventEmitter, logService, cls);
  }

  async findColumnsByTableId(
    tableId: string,
    tenantId?: string | null,
  ): Promise<any[]> {
    return await this.execute(async (db) => {
      return await db
        .select()
        .from(tableColumnInstances)
        .leftJoin(
          fieldDefinitions,
          eq(tableColumnInstances.fieldDefinitionId, fieldDefinitions.id),
        )
        .where(
          and(
            eq(tableColumnInstances.tableMetadataId, tableId),
            eq(tableColumnInstances.isActive, true),
            ...(tenantId
              ? [
                  or(
                    isNull(tableColumnInstances.tenantId),
                    eq(tableColumnInstances.tenantId, tenantId),
                  ),
                ]
              : []),
          ),
        )
        .orderBy(asc(tableColumnInstances.displayOrder));
    }, "read");
  }
}
