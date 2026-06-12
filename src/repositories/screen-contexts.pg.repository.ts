import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@esmaeel_emadi/nestjs-core";
import { screenContexts } from "../schemas";

@Injectable()
export class ScreenContextsPgRepository extends Repository<
  any,
  typeof screenContexts
> {
  protected override tableName = "screenContexts";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return condition;
  }

  protected override filterableFields: Record<string, (value: any) => SQL> = {};
  protected override searchableColumns: any = [];
  protected override defaultSortColumn: any = "createdAt";
  protected override includeMap = {};

  constructor(
    @Optional() readonly eventEmitter: EventEmitter2,
    @InjectTransactionHost("MAIN_DB") readonly txHost: TransactionHost,
    @Optional() protected readonly logService?: ILogService,
    @Optional() protected readonly cls?: ClsService,
  ) {
    super(screenContexts, txHost, eventEmitter, logService, cls);
  }
}
