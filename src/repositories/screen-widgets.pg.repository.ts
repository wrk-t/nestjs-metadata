import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { eq, SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@wrk-t/nestjs-core";
import { screenWidgets } from "../schemas";

@Injectable()
export class ScreenWidgetsPgRepository extends Repository<
  any,
  typeof screenWidgets
> {
  protected override tableName = "screenWidgets";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return condition;
  }

  protected override filterableFields: Record<string, (value: any) => SQL> = {
    screenId: (value: string) => eq(screenWidgets.screenId, value),
    isActive: (value: boolean) => eq(screenWidgets.isActive, value),
    tenantId: (value: string) => eq(screenWidgets.tenantId, value),
  };

  protected override searchableColumns: any = [];
  protected override defaultSortColumn: any = "displayOrder";
  protected override includeMap = {};

  constructor(
    @Optional() readonly eventEmitter: EventEmitter2,
    @InjectTransactionHost("MAIN_DB") readonly txHost: TransactionHost,
    @Optional() protected readonly logService?: ILogService,
    @Optional() protected readonly cls?: ClsService,
  ) {
    super(screenWidgets, txHost, eventEmitter, logService, cls);
  }
}
