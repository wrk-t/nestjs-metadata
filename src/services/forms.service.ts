import {
  BadRequestDto,
  ForbiddenDto,
  NotFoundDto,
} from "@wrk-t/ts-exc";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import type { TScope } from "@wrk-t/nestjs-core";
import type { fieldDefinitions } from "../schemas";
import { fieldOverrides } from "../schemas";
import { formElements } from "../schemas";
import { formOverrides } from "../schemas";
import { formSections } from "../schemas";
import { forms } from "../schemas";
import { sectionOverrides } from "../schemas";
import { AccessControlService } from "@wrk-t/nestjs-core";
import type { ScopeMap } from "@wrk-t/nestjs-core";
import { RequestContext } from "@wrk-t/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { ITranslationService } from "@wrk-t/nestjs-core";
import { FormsPgRepository } from "../repositories/forms.pg.repository";
import { TRANSLATION_SERVICE } from "../metadata.types";
import type {
  FieldType,
  IFormRenderResponse,
  RenderField,
  SelectOption,
  TFormRenderData,
} from "./forms.types";

@Injectable()
export class FormsService extends MetadataBaseService<
  typeof forms,
  FormsPgRepository
> {
  logger = new Logger(FormsService.name);
  constructor(
    repo: FormsPgRepository,
    private readonly access: AccessControlService,
    @Optional()
    @Inject(TRANSLATION_SERVICE)
    readonly translationService?: ITranslationService,
    @Optional() requestContext?: RequestContext,
  ) {
    super(repo, requestContext, translationService);
  }

  protected override guardCreate(
    data: typeof forms.$inferInsert,
  ): BadRequestDto | ForbiddenDto | undefined {
    const isAllTenants = this.requestContext
      ?.getScopesForResource("tenants")
      .includes("all");

    if (!isAllTenants) {
      const userTenantId = this.requestContext?.getTenantId();
      if (!userTenantId) {
        return new ForbiddenDto("You must belong to a tenant to create a form");
      }
      if (
        data.tenantId !== undefined &&
        data.tenantId !== null &&
        data.tenantId !== userTenantId
      ) {
        return new ForbiddenDto(
          "Only users with full tenant access can assign a form to a different tenant",
        );
      }
      data.tenantId = userTenantId;
    }
  }

  protected override guardUpdate(
    _id: string,
    existing: typeof forms.$inferSelect,
    data: Partial<typeof forms.$inferInsert>,
  ): ForbiddenDto | undefined {
    const accessErr = this.access.guardResourceAccess("forms", existing);
    if (accessErr) return accessErr as any;

    if (data.tenantId !== undefined && data.tenantId !== existing.tenantId) {
      return this.access.requireScope("tenants", "all") as any;
    }
  }

  protected override guardDelete(
    _id: string,
    _existing: typeof forms.$inferSelect,
  ): ForbiddenDto | undefined {
    return this.access.requireScope("forms", "all") as any;
  }

  protected override guardRecover(
    _id: string,
    _existing: typeof forms.$inferSelect,
  ): any {
    return this.access.requireScope("forms", "all") as any;
  }

  async getFormRender(
    formId: string,
    options?: {
      context?: "create" | "edit" | "view";
      roleNames?: string[];
      scopeMap?: ScopeMap;
      recordId?: string;
      tenantId?: string;
      locale?: string;
    },
  ) {
    const ctx = options?.context ?? "create";
    const locale = options?.locale ?? "en";
    const userRoles = options?.roleNames ?? [];
    const scopeMap = options?.scopeMap ?? {};

    const formData = await this.repo.getFormRenderData(
      formId,
      options?.tenantId,
    );

    if (!formData) return new NotFoundDto([]);

    const adaptedForm = this.adaptForm(formData, ctx);
    const allFields = await this.buildRenderFields(
      formData,
      ctx,
      userRoles,
      scopeMap,
    );
    const { sections, ungroupedFields } = this.groupIntoSections(
      formData.sections,
      formData.sectionOverrides ?? [],
      allFields,
    );

    const payload = { form: adaptedForm, sections, ungroupedFields };

    if (!this.translationService) {
      return payload;
    }

    return this.translationService.resolveTranslations(
      payload,
      locale,
      options?.tenantId,
    );
  }

  // ── adaptForm ──

  private adaptForm(
    data: NonNullable<
      Awaited<ReturnType<FormsPgRepository["getFormRenderData"]>>
    >,
    ctx: "create" | "edit" | "view",
  ): IFormRenderResponse["form"] {
    const {
      sections: _s,
      elements: _e,
      formOverrides = [],
      sectionOverrides: _so = [],
      fieldOverrides: _fo = [],
      ...form
    } = data;

    const fo = formOverrides[0] ?? null;

    return {
      id: form.id,
      name: form.name,
      displayName: fo?.displayName ?? form.displayName,
      description: form.description,
      version: form.version,
      renderContext: ctx,
      actions: this.adaptActions(form.actions, fo, ctx),
      settings: {
        ...form.settings,
        ...(fo?.settings ?? {}),
        readonly: ctx === "view",
      },
      category: form.category,
      isActive: form.isActive,
      isSystem: form.isSystem,
      tenantId: form.tenantId,
      dataSource: form.dataSource,
      meta: form.meta,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
      deletedAt: form.deletedAt?.toISOString() ?? null,
    } as unknown as IFormRenderResponse["form"];
  }

  private adaptActions(
    actions: (typeof forms.$inferSelect)["actions"],
    fo: typeof formOverrides.$inferSelect | null,
    ctx: "create" | "edit" | "view",
  ) {
    let adapted = fo?.actions
      ? [...(fo.actions as typeof actions)]
      : [...actions];

    adapted = adapted.map((a: any) => {
      if (a.type === "submit") {
        const { type, redirect, ...rest } = a;
        return { action: "apiCall", ...rest, successRedirect: redirect };
      }
      if (a.type === "cancel") {
        const { type, redirect, ...rest } = a;
        return { action: "cancel", ...rest };
      }
      return a;
    });

    return adapted.filter(
      (a) =>
        !(a as Record<string, unknown>).context ||
        (a as Record<string, unknown>).context === ctx,
    );
  }

  // ── buildRenderFields ──

  private async buildRenderFields(
    data: TFormRenderData,
    ctx: "create" | "edit" | "view",
    userRoles: string[],
    scopeMap: ScopeMap,
  ): Promise<RenderField[]> {
    const { elements: allElementRows, fieldOverrides = [], id } = data;

    const overrideByElement = new Map(
      fieldOverrides.filter((o) => o.elementId).map((o) => [o.elementId!, o]),
    );
    const newFieldOverrides = fieldOverrides.filter((o) => !o.elementId);

    // Batch-resolve field definitions for new-field overrides
    const newFieldDefIds = newFieldOverrides
      .map((o) => o.fieldDefinitionId)
      .filter((id): id is string => id != null);
    const newFieldDefs =
      await this.repo.findFieldDefinitionsByIds(newFieldDefIds);
    const newFieldDefMap = new Map(newFieldDefs.map((fd) => [fd.id, fd]));

    const fields: RenderField[] = [];

    // Existing elements
    for (const el of allElementRows) {
      const fd = el.fieldDefinition;
      if (!fd) continue;
      const ov = overrideByElement.get(el.id);
      if (ov?.isHidden === true) continue;
      if (this.shouldHideField(fd, ctx, userRoles, scopeMap)) continue;
      fields.push(this.toRenderField(el, fd, ctx, ov, el.uiComponent));
    }

    // Tenant-added fields (overrides with no elementId)
    for (const ov of newFieldOverrides) {
      if (!ov.fieldDefinitionId) continue;
      const fd = newFieldDefMap.get(ov.fieldDefinitionId);
      if (!fd) continue;
      fields.push(
        this.toRenderField(
          {
            formId: id,
            sectionId: ov.sectionId,
            fieldDefinitionId: ov.fieldDefinitionId,
            uiComponentId: null,
            fieldOverrides: null,
            uiOverrides: null,
            instanceConfig: null,
            displayOrder: ov.displayOrder ?? 999,
            colSpan: ov.colSpan,
            tenantId: null,
            isActive: true,
            meta: null,
            id: `ovr_${ov.fieldDefinitionId}`,
          },
          fd,
          ctx,
          ov,
        ),
      );
    }

    fields.sort((a, b) => a.order - b.order);
    return fields;
  }

  // ── groupIntoSections ──

  private groupIntoSections(
    sections: (typeof formSections.$inferSelect)[],
    secOverrides: (typeof sectionOverrides.$inferSelect)[],
    allFields: RenderField[],
  ) {
    const overrideBySection = new Map(
      secOverrides.map((o) => [o.sectionId, o]),
    );
    const sectionIds = new Set(sections.map((s) => s.id));

    const fieldsBySection = new Map<string, RenderField[]>();
    for (const s of sections) fieldsBySection.set(s.id, []);
    for (const f of allFields) {
      if (f.sectionId && sectionIds.has(f.sectionId))
        fieldsBySection.get(f.sectionId)?.push(f);
    }

    const sectioned = sections
      .filter((s) => !overrideBySection.get(s.id)?.isHidden)
      .map((s) => {
        const ov = overrideBySection.get(s.id);
        return {
          id: s.id,
          name: s.name,
          displayName: ov?.displayName ?? s.displayName,
          description: ov?.description ?? s.description,
          collapsible: ov?.collapsible ?? s.collapsible ?? false,
          collapsedByDefault:
            ov?.collapsedByDefault ?? s.collapsedByDefault ?? false,
          displayOrder: ov?.displayOrder ?? s.displayOrder ?? 0,
          fields: fieldsBySection.get(s.id) ?? [],
        };
      });

    return {
      sections: sectioned,
      ungroupedFields: allFields.filter(
        (f) => !(f.sectionId && sectionIds.has(f.sectionId)),
      ),
    };
  }

  // ── Permission & visibility helpers ──

  private shouldHideField(
    fd: typeof fieldDefinitions.$inferSelect,
    ctx: "create" | "edit" | "view",
    userRoles: string[],
    scopeMap: ScopeMap = {},
  ): boolean {
    if (userRoles.includes("*skip-visibility-check*")) return false;

    if (fd.visibleToPermissions?.length) {
      const hasAllPermissions = fd.visibleToPermissions.every((req) =>
        this.userHasPermissionScope(
          scopeMap,
          req.resource,
          req.action,
          req.scope,
        ),
      );
      if (!hasAllPermissions) return true;
    } else if (
      fd.visibleToRoles?.length &&
      !fd.visibleToRoles.some((r) => userRoles.includes(r))
    ) {
      return true;
    }

    if (ctx === "create" && fd.hideOnCreate) return true;
    if (ctx === "edit" && fd.hideOnUpdate) return true;
    return false;
  }

  private userHasPermissionScope(
    scopeMap: ScopeMap,
    resource: string,
    action: string,
    requiredScope?: "own" | "tenant" | "all",
  ): boolean {
    const compositeKey = `${resource}:${action}`;
    const userScopes = scopeMap[compositeKey] ?? scopeMap[resource];
    if (!userScopes || userScopes.length === 0) return false;
    if (!requiredScope) return true;

    const SCOPE_LEVEL: Record<TScope, number> = { own: 0, tenant: 1, all: 2 };
    const requiredLevel = SCOPE_LEVEL[requiredScope];
    return userScopes.some((s) => SCOPE_LEVEL[s as TScope] >= requiredLevel);
  }

  // ── toRenderField ──

  private isReadOnly(
    fd: typeof fieldDefinitions.$inferSelect,
    ctx: "create" | "edit" | "view",
  ): boolean {
    if (ctx === "view") return true;
    if (ctx === "create" && fd.readonlyOnCreate) return true;
    if (ctx === "edit" && fd.readonlyOnUpdate) return true;
    return false;
  }

  private toRenderField(
    el: {
      id: string;
      formId: string;
      sectionId: string | null;
      fieldDefinitionId: string | null;
      uiComponentId: string | null;
      displayOrder: number | null;
      colSpan: number | null;
      fieldOverrides: unknown;
      uiOverrides: unknown;
      instanceConfig: unknown;
      tenantId: string | null;
      isActive: boolean | null;
      meta: Record<string, unknown> | null;
    },
    fd: typeof fieldDefinitions.$inferSelect,
    ctx: "create" | "edit" | "view",
    override?: {
      displayName?: string | null;
      isRequired?: boolean | null;
      isReadOnly?: boolean | null;
      placeholder?: string | null;
      tooltip?: string | null;
      defaultValue?: unknown;
      datasource?: unknown;
      validations?: unknown;
    },
    uiComponent?: {
      name: string;
      displayName: string | null;
      componentType: string;
      configProps: Record<string, unknown> | null;
    } | null,
  ): RenderField {
    const readonly = override?.isReadOnly ?? this.isReadOnly(fd, ctx);
    const isRequired =
      override?.isRequired ??
      fd.validations?.some((v) => v[0] === "Required") ??
      false;

    const elOverrides = el.fieldOverrides as Record<string, unknown> | null;
    const label =
      override?.displayName ??
      (elOverrides?.displayName as string | undefined) ??
      fd.displayName;

    const mergedDs = (override?.datasource ?? fd.datasource) as
      | Record<string, unknown>
      | null
      | undefined;
    const resolvedDatasource = this.resolveDatasource(mergedDs);

    const options = this.resolveOptions(mergedDs);
    const selectTypes = new Set([
      "select",
      "multiselect",
      "radio",
      "autocomplete",
    ]);
    const hasOptions = selectTypes.has(fd.type);

    return {
      id: el.id,
      formId: el.formId,
      name: fd.name,
      label,
      isRequired,
      isReadOnly: readonly,
      isActive: el.isActive ?? true,
      order: el.displayOrder ?? 0,
      colSpan: el.colSpan ?? undefined,
      sectionId: el.sectionId,
      dependsOn: fd.dependsOn ?? undefined,
      visibleWhen: fd.visibleWhen ?? undefined,
      disabledWhen: fd.disabledWhen ?? undefined,
      fieldOverrides: {
        ...(el.fieldOverrides as Record<string, unknown> | undefined),
        ...(resolvedDatasource ? { datasource: resolvedDatasource } : {}),
      },
      uiOverrides: el.uiOverrides ?? undefined,
      instanceConfig: el.instanceConfig ?? undefined,
      fieldDefinitionId: el.fieldDefinitionId,
      uiComponentId: el.uiComponentId,
      uiComponent: uiComponent
        ? {
            name: uiComponent.name,
            displayName: uiComponent.displayName,
            componentType: uiComponent.componentType,
            configProps: uiComponent.configProps,
          }
        : null,
      tenantId: el.tenantId,
      meta: el.meta ?? undefined,
      type: fd.type as FieldType,
      ...(hasOptions ? { options } : {}),
    } as unknown as RenderField;
  }

  private resolveOptions(datasource: unknown): SelectOption[] {
    if (!datasource || typeof datasource !== "object") return [];
    const ds = datasource as Record<string, unknown>;
    return ds.type === "static" && Array.isArray(ds.options)
      ? (ds.options as SelectOption[])
      : [];
  }

  private resolveDatasource(
    datasource: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null {
    if (!datasource || typeof datasource !== "object") return null;
    const ds = datasource as Record<string, unknown>;
    if (ds.type !== "entity") return datasource;

    const entity = ds.entity as string;
    const displayField = (ds.displayField as string) ?? "name";
    const valueField = (ds.valueField as string) ?? "id";
    const searchFields = (ds.searchFields as string[]) ?? [displayField];
    const filter = ds.filter as { field: string; value: unknown } | undefined;
    const orderBy = ds.orderBy as
      | { field: string; direction: "asc" | "desc" }
      | undefined;

    return {
      type: "service",
      endpoint: `/api/v1/${entity}`,
      method: "GET",
      entityMeta: {
        displayField,
        valueField,
        searchFields,
        ...(filter ? { filter } : {}),
        ...(orderBy ? { orderBy } : {}),
      },
    };
  }
}
