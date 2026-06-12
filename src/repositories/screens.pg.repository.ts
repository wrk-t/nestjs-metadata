import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { eq, SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@esmaeel_emadi/nestjs-core";
import { screens } from "../schemas";

@Injectable()
export class ScreensPgRepository extends Repository<any, typeof screens> {
  protected override tableName = "screens";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return condition;
  }

  protected override filterableFields: Record<string, (value: any) => SQL> = {
    moduleId: (value: string) => eq(screens.moduleId, value),
    isActive: (value: boolean) => eq(screens.isActive, value),
    tenantId: (value: string) => eq(screens.tenantId, value),
  };

  protected override searchableColumns: any = ["name", "displayName"];
  protected override defaultSortColumn: any = "displayOrder";
  protected override includeMap = {};

  constructor(
    @Optional() readonly eventEmitter: EventEmitter2,
    @InjectTransactionHost("MAIN_DB") readonly txHost: TransactionHost,
    @Optional() protected readonly logService?: ILogService,
    @Optional() protected readonly cls?: ClsService,
  ) {
    super(screens, txHost, eventEmitter, logService, cls);
  }
}
