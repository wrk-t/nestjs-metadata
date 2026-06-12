import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { eq, SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@esmaeel_emadi/nestjs-core";
import { widgetContracts } from "../schemas";

@Injectable()
export class WidgetContractsPgRepository extends Repository<
  any,
  typeof widgetContracts
> {
  protected override tableName = "widgetContracts";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return condition;
  }

  protected override filterableFields: Record<string, (value: any) => SQL> = {
    widgetType: (value: any) => eq(widgetContracts.widgetType, value),
    resourceId: (value: string) => eq(widgetContracts.resourceId, value),
    isActive: (value: boolean) => eq(widgetContracts.isActive, value),
  };

  protected override searchableColumns: any = [];
  protected override defaultSortColumn: any = "createdAt";
  protected override includeMap = {};

  constructor(
    @Optional() readonly eventEmitter: EventEmitter2,
    @InjectTransactionHost("MAIN_DB") readonly txHost: TransactionHost,
    @Optional() protected readonly logService?: ILogService,
    @Optional() protected readonly cls?: ClsService,
  ) {
    super(widgetContracts, txHost, eventEmitter, logService, cls);
  }
}
