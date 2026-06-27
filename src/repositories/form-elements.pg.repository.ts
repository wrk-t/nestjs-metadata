import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { eq, SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@wrk-t/nestjs-core";
import { formElements } from "../schemas";

@Injectable()
export class FormElementsPgRepository extends Repository<
  any,
  typeof formElements
> {
  protected override tableName = "formElements";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return this.resolveScopeFilter(condition, { tenant: this.table.tenantId });
  }

  protected override filterableFields: Record<string, (value: any) => SQL> = {
    formId: (value: string) => eq(formElements.formId, value),
    sectionId: (value: string) => eq(formElements.sectionId, value),
    isActive: (value: boolean) => eq(formElements.isActive, value),
    tenantId: (value: string) => eq(formElements.tenantId, value),
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
    super(formElements, txHost, eventEmitter, logService, cls);
  }
}
