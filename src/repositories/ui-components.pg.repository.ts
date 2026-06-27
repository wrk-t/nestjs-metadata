import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { eq, SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@wrk-t/nestjs-core";
import { uiComponents } from "../schemas";

@Injectable()
export class UiComponentsPgRepository extends Repository<
  any,
  typeof uiComponents
> {
  protected override tableName = "uiComponents";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return condition;
  }

  protected override filterableFields: Record<string, (value: any) => SQL> = {
    isActive: (v) => eq(uiComponents.isActive, v),
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
    super(uiComponents, txHost, eventEmitter, logService, cls);
  }
}
