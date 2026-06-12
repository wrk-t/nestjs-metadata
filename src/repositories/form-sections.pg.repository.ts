import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { eq, SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@esmaeel_emadi/nestjs-core";
import { formSections } from "../schemas";

@Injectable()
export class FormSectionsPgRepository extends Repository<
  any,
  typeof formSections
> {
  protected override tableName = "formSections";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return this.resolveScopeFilter(condition, { tenant: this.table.tenantId });
  }

  protected override filterableFields: Record<string, (value: any) => SQL> = {
    formId: (value: string) => eq(formSections.formId, value),
    isActive: (value: boolean) => eq(formSections.isActive, value),
    tenantId: (value: string) => eq(formSections.tenantId, value),
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
    super(formSections, txHost, eventEmitter, logService, cls);
  }
}
