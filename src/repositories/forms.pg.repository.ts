import { Injectable, Inject, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";
import { asc, eq, inArray, isNull, or, SQL } from "drizzle-orm";
// any removed;
// MAIN_DB imported from consumer;
import { fieldDefinitions } from "../schemas";
import { fieldOverrides } from "../schemas";
import { formElements } from "../schemas";
import { formOverrides } from "../schemas";
import { formSections } from "../schemas";
import { forms } from "../schemas";
import { sectionOverrides } from "../schemas";
import { Repository } from "@wrk-t/nestjs-core";
import type { ILogService } from "@wrk-t/nestjs-core";
// types removed;
import { TFormRenderData } from "../services/forms.types";

@Injectable()
export class FormsPgRepository extends Repository<any, typeof forms> {
  protected override tableName = "forms";

  override applyScope(condition: SQL | undefined): SQL | undefined {
    return this.resolveScopeFilter(condition, { tenant: this.table.tenantId });
  }

  protected override filterableFields = {
    isActive: (value: boolean) => eq(forms.isActive, value),
    isSystem: (value: boolean) => eq(forms.isSystem, value),
    category: (value: string) => eq(forms.category, value),
    tenantId: (value: string) => eq(forms.tenantId, value),
  };

  protected override searchableColumns: any = ["name", "displayName"];

  protected override defaultSortColumn: any = "createdAt";

  protected override includeMap = {
    sections: {
      sections: {
        with: {
          elements: {
            with: {
              fieldDefinition: true,
              uiComponent: true,
            },
          },
        },
      },
    },
    elements: {
      elements: {
        with: {
          fieldDefinition: true,
          uiComponent: true,
        },
      },
    },
  };

  // ── Form render data fetching ──

  /**
   * Fetch everything needed to render a form in a single relational
   * query: the form, its sections, its elements (with field definitions
   * and UI components), and all tenant-level overrides.
   */
  async getFormRenderData(
    formId: string,
    tenantId?: string,
  ): Promise<TFormRenderData | null> {
    return await this.execute(async (db) => {
      const elementsWhere = tenantId
        ? or(isNull(formElements.tenantId), eq(formElements.tenantId, tenantId))
        : isNull(formElements.tenantId);

      const withOverrides = tenantId
        ? {
            formOverrides: {
              where: eq(formOverrides.tenantId, tenantId),
              limit: 1,
            },
            sectionOverrides: {
              where: eq(sectionOverrides.tenantId, tenantId),
            },
            fieldOverrides: {
              where: eq(fieldOverrides.tenantId, tenantId),
            },
          }
        : {};

      return (await db.query.forms.findFirst({
        where: eq(forms.id, formId),
        with: {
          sections: {
            orderBy: asc(formSections.displayOrder),
          },
          elements: {
            where: elementsWhere,
            orderBy: [
              asc(formElements.sectionId),
              asc(formElements.displayOrder),
            ],
            with: {
              fieldDefinition: true,
              uiComponent: true,
            },
          },
          ...withOverrides,
        },
      })) as TFormRenderData;
    }, "read");
  }

  /**
   * Batch-fetch field definitions by ID for new fields added via
   * tenant overrides (where elementId IS NULL on fieldOverrides).
   */
  async findFieldDefinitionsByIds(
    ids: string[],
  ): Promise<(typeof fieldDefinitions.$inferSelect)[]> {
    if (ids.length === 0) return [];
    return await this.execute(async (db) => {
      return await db
        .select()
        .from(fieldDefinitions)
        .where(inArray(fieldDefinitions.id, ids));
    }, "read");
  }

  constructor(
    @Optional() readonly eventEmitter: EventEmitter2,
    @InjectTransactionHost("MAIN_DB") readonly txHost: TransactionHost,
    @Optional() protected readonly logService?: ILogService,
    @Optional() protected readonly cls?: any,
  ) {
    super(forms, txHost, eventEmitter, logService, cls);
  }
}
