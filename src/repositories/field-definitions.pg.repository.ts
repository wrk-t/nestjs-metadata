import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@wrk-t/nestjs-core";
import { fieldDefinitions } from "../schemas";

@Injectable()
export class FieldDefinitionsPgRepository extends Repository<
  any,
  typeof fieldDefinitions
> {
  protected override tableName = "fieldDefinitions";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return condition;
  }

  protected override filterableFields: Record<string, (value: any) => SQL> = {};
  protected override searchableColumns: any = ["name", "displayName", "type"];
  protected override defaultSortColumn: any = "createdAt";
  protected override includeMap = {};

  constructor(
    @Optional() readonly eventEmitter: EventEmitter2,
    @InjectTransactionHost("MAIN_DB") readonly txHost: TransactionHost,
    @Optional() protected readonly logService?: ILogService,
    @Optional() protected readonly cls?: ClsService,
  ) {
    super(fieldDefinitions, txHost, eventEmitter, logService, cls);
  }
}
