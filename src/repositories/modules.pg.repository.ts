import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { eq, SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@wrk-t/nestjs-core";
import { modules } from "../schemas";

@Injectable()
export class ModulesPgRepository extends Repository<any, typeof modules> {
  protected override tableName = "modules";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return condition;
  }

  protected override filterableFields: Record<string, (value: any) => SQL> = {
    isActive: (value: boolean) => eq(modules.isActive, value),
    tenantId: (value: string) => eq(modules.tenantId, value),
  };

  protected override searchableColumns: any = ["name", "displayName"];
  protected override defaultSortColumn: any = "createdAt";
  protected override includeMap = {};

  constructor(
    @Optional() readonly eventEmitter: EventEmitter2,
    @InjectTransactionHost("MAIN_DB") readonly txHost: TransactionHost,
    @Optional() protected readonly logService?: ILogService,
    @Optional() protected readonly cls?: ClsService,
  ) {
    super(modules, txHost, eventEmitter, logService, cls);
  }
}
