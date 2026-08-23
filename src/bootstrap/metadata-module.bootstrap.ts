// ──────────────────────────────────────────────────────────────────
// Metadata module bootstrap
//
// Self-registers the built-in "metadata" navigation module on app
// bootstrap: one screen per metadata table (entities, features,
// modules, screens, screen widgets, screen contexts, components,
// field definitions, ui components), each rendering a simple
// read-only table — no toolbar or row actions.
//
// Super-admin only:
//   - modules.visibleToSuperAdmin = true (enforced in ModulesService)
//   - every screen carries visibleToPermissions on the "users"
//     resource — the host's super-admin-only permission
//
// Idempotent: rows are keyed by fixed CUIDs below and skipped when
// they already exist. Safe to run on every boot.
// ──────────────────────────────────────────────────────────────────

import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { modules } from "../schemas";
import { ComponentsPgRepository } from "../repositories/components.pg.repository";
import { ModulesPgRepository } from "../repositories/modules.pg.repository";
import { ScreensPgRepository } from "../repositories/screens.pg.repository";
import { ScreenWidgetsPgRepository } from "../repositories/screen-widgets.pg.repository";

// ── Fixed CUIDs (owned by this package) ─────────────────────────
export const METADATA_MODULE_CUIDS = {
  module: 1,
  entities: {
    screen: 1,
    widget: 1,
    page: 1,
    table: 2,
    ref: 1,
    colName: 2,
    colTableName: 3,
    colDisplayName: 4,
    colDescription: 5,
    colIsActive: 6,
  },
  features: {
    screen: 2,
    widget: 2,
    page: 3,
    table: 4,
    ref: 7,
    colName: 8,
    colDisplayName: 9,
    colDescription: 10,
    colIsActive: 11,
  },
  modules: {
    screen: 3,
    widget: 3,
    page: 5,
    table: 6,
    ref: 12,
    colName: 13,
    colDisplayName: 14,
    colIcon: 15,
    colDisplayOrder: 16,
    colIsActive: 17,
  },
  screens: {
    screen: 4,
    widget: 4,
    page: 7,
    table: 8,
    ref: 18,
    colName: 19,
    colDisplayName: 20,
    colIcon: 21,
    colPathPattern: 22,
    colDisplayOrder: 23,
    colIsActive: 24,
  },
  screenWidgets: {
    screen: 5,
    widget: 5,
    page: 9,
    table: 10,
    ref: 25,
    colScreenId: 26,
    colWidgetType: 27,
    colDisplayOrder: 28,
    colIsActive: 29,
  },
  screenContexts: {
    screen: 6,
    widget: 6,
    page: 11,
    table: 12,
    ref: 30,
    colName: 31,
    colSource: 32,
    colKey: 33,
    colIsActive: 34,
  },
  components: {
    screen: 7,
    widget: 7,
    page: 13,
    table: 14,
    ref: 35,
    colName: 36,
    colDisplayName: 37,
    colDisplayOrder: 38,
    colIsActive: 39,
  },
  fieldDefinitions: {
    screen: 8,
    widget: 8,
    page: 15,
    table: 16,
    ref: 40,
    colName: 41,
    colDisplayName: 42,
    colType: 43,
    colIsActive: 44,
  },
  uiComponents: {
    screen: 9,
    widget: 9,
    page: 17,
    table: 18,
    ref: 45,
    colName: 46,
    colDisplayName: 47,
    colType: 48,
    colIsActive: 49,
  },
	  screenDetail: {
	    screen: 10,
	    widget: 10,
	    page: 19,
	    list: 50,
	    ref: 51,
	  },
	  moduleDetail: {
	    screen: 11,
	    widget: 11,
	    page: 20,
	    table: 21,
	    ref: 52,
	    colName: 53,
	    colDisplayName: 54,
	    colIcon: 55,
	    colPathPattern: 56,
	    colDisplayOrder: 57,
	    colIsActive: 58,
	  },
	} as const;

// ── Registry ────────────────────────────────────────────────────
export interface MetadataTableColumnDef {
  name: string;
  label: string;
  format?: "text" | "date";
  width?: number;
}

export interface MetadataTableDef {
  key: string;
  label: string;
  endpoint: string;
  columns: MetadataTableColumnDef[];
  /** Row-click redirect template (resolved with the row's fields). */
  onRowClick?: string;
}

export const METADATA_TABLES: MetadataTableDef[] = [
  {
    key: "entities",
    label: "$trl_metadata_entities",
    endpoint: "/api/v1/entities",
    columns: [
      { name: "name", label: "$trl_name" },
      { name: "tableName", label: "$trl_table_name" },
      { name: "displayName", label: "$trl_display_name" },
      { name: "description", label: "$trl_description" },
      { name: "isActive", label: "$trl_is_active" },
    ],
  },
  {
    key: "features",
    label: "$trl_metadata_features",
    endpoint: "/api/v1/features",
    columns: [
      { name: "name", label: "$trl_name" },
      { name: "displayName", label: "$trl_display_name" },
      { name: "description", label: "$trl_description" },
      { name: "isActive", label: "$trl_is_active" },
    ],
  },
	  {
	    key: "modules",
	    label: "$trl_metadata_modules",
	    endpoint: "/api/v1/modules",
	    onRowClick: "/dashboard/metadata/modules/{id}",
	    columns: [
	      { name: "name", label: "$trl_name" },
	      { name: "displayName", label: "$trl_display_name" },
	      { name: "icon", label: "$trl_icon" },
	      { name: "displayOrder", label: "$trl_display_order" },
	      { name: "isActive", label: "$trl_is_active" },
	    ],
	  },
  {
    key: "screens",
    label: "$trl_metadata_screens",
    endpoint: "/api/v1/screens",
    onRowClick: "/dashboard/metadata/screens/{id}",
    columns: [
      { name: "name", label: "$trl_name" },
      { name: "displayName", label: "$trl_display_name" },
      { name: "icon", label: "$trl_icon" },
      { name: "pathPattern", label: "$trl_path_pattern" },
      { name: "displayOrder", label: "$trl_display_order" },
      { name: "isActive", label: "$trl_is_active" },
    ],
  },
  {
    key: "screenWidgets",
    label: "$trl_metadata_screenWidgets",
    endpoint: "/api/v1/screen-widgets",
    columns: [
      { name: "screenId", label: "$trl_screen_id" },
      { name: "widgetType", label: "$trl_widget_type" },
      { name: "displayOrder", label: "$trl_display_order" },
      { name: "isActive", label: "$trl_is_active" },
    ],
  },
  {
    key: "screenContexts",
    label: "$trl_metadata_screenContexts",
    endpoint: "/api/v1/screen-contexts",
    columns: [
      { name: "name", label: "$trl_name" },
      { name: "source", label: "$trl_source" },
      { name: "key", label: "$trl_key" },
      { name: "isActive", label: "$trl_is_active" },
    ],
  },
  {
    key: "components",
    label: "$trl_metadata_components",
    endpoint: "/api/v1/components",
    columns: [
      { name: "name", label: "$trl_name" },
      { name: "displayName", label: "$trl_display_name" },
      { name: "displayOrder", label: "$trl_display_order" },
      { name: "isActive", label: "$trl_is_active" },
    ],
  },
  {
    key: "fieldDefinitions",
    label: "$trl_metadata_fieldDefinitions",
    endpoint: "/api/v1/field-definitions",
    columns: [
      { name: "name", label: "$trl_field_name" },
      { name: "displayName", label: "$trl_display_name" },
      { name: "type", label: "$trl_field_type" },
      { name: "isActive", label: "$trl_is_active" },
    ],
  },
  {
    key: "uiComponents",
    label: "$trl_metadata_uiComponents",
    endpoint: "/api/v1/ui-components",
    columns: [
      { name: "name", label: "$trl_name" },
      { name: "displayName", label: "$trl_display_name" },
      { name: "type", label: "$trl_type" },
      { name: "isActive", label: "$trl_is_active" },
    ],
  },
];

/** Super-admin gate — the "users" resource is granted exclusively to super admins. */
const SUPER_ADMIN_ONLY = [
  { resource: "users", action: "read", scope: "all" as const },
];

const MODULE_NAME = "metadata";

// ── Bootstrap service ───────────────────────────────────────────

@Injectable()
export class MetadataModuleBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MetadataModuleBootstrapService.name);

  constructor(
    private readonly modulesRepo: ModulesPgRepository,
    private readonly screensRepo: ScreensPgRepository,
    private readonly widgetsRepo: ScreenWidgetsPgRepository,
    private readonly componentsRepo: ComponentsPgRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.ensureMetadataModule();
    } catch (err) {
      this.logger.warn(
        `Metadata module bootstrap failed: ${(err as Error)?.message ?? err}`,
      );
    }
  }

  // ── Ensure module + screens exist (idempotent) ────────────────
  private async ensureMetadataModule(): Promise<void> {
    // Hosts seed the general screen-layout blueprint under either spelling.
    const pageBp =
      (await this.componentsRepo.findBlueprintByName("screenLayoutGeneral")) ??
      (await this.componentsRepo.findBlueprintByName("screen_layout_general"));
    const tableBp = await this.componentsRepo.findBlueprintByName("table");
    if (!pageBp || !tableBp) {
      this.logger.warn(
        "Blueprints 'screenLayoutGeneral'/'table' not found — skipping metadata module bootstrap",
      );
      return;
    }

    const pageSlot =
      pageBp.slots.find((s) => s.name === "body")?.name ??
      pageBp.slots[0]?.name;
    const columnsSlot =
      tableBp.slots.find((s) => s.name === "columns")?.name ??
      tableBp.slots[0]?.name;
    if (!pageSlot || !columnsSlot) {
      this.logger.warn(
        "Blueprint slots not found — skipping metadata module bootstrap",
      );
      return;
    }

    // Module (once)
    const existingModule = await this.modulesRepo.selectOne(
      eq(modules.name, MODULE_NAME),
    );
    const moduleId =
      existingModule?.id ??
      (
        await this.modulesRepo.createOne({
          id: METADATA_MODULE_CUIDS.module,
          name: MODULE_NAME,
          displayName: "$trl_metadata",
          description: "$trl_metadata_desc",
          icon: "Storage",
          tenantId: null,
          overridesModuleId: null,
          displayOrder: 400,
          isActive: true,
          visibleToSuperAdmin: true,
          meta: null,
        })
      )[0].id;

    	// One screen per metadata table
    	for (const [index, def] of METADATA_TABLES.entries()) {
    		await this.ensureTable(
    			def,
    			index,
    			moduleId,
    			pageBp.id,
    			tableBp.id,
    			pageSlot,
    			columnsSlot,
    		);
    	}

  	// Screen detail page — visual tree of the components used on a screen.
  	const treeBp = await this.componentsRepo.findBlueprintByName("screen-tree");
  	if (!treeBp) {
  		this.logger.warn(
  			"Blueprint 'screen-tree' not found — skipping metadata screen-detail bootstrap",
  		);
  	} else {
  		await this.ensureScreenDetail(
  			moduleId,
  			pageBp.id,
  			pageSlot,
  			treeBp.id,
  		);
  	}

  	// Module detail page — list of the screens in a module.
  	await this.ensureModuleDetail(
  		moduleId,
  		pageBp.id,
  		pageSlot,
  		tableBp.id,
  		columnsSlot,
  	);
    }

  private async ensureTable(
    def: MetadataTableDef,
    index: number,
    moduleId: number,
    pageBpId: number,
    tableBpId: number,
    pageSlot: string,
    columnsSlot: string,
  ): Promise<void> {
    const cuids = METADATA_MODULE_CUIDS[
      def.key as keyof typeof METADATA_MODULE_CUIDS
    ] as Record<string, number>;
    const key = `metadata${def.key.charAt(0).toUpperCase()}${def.key.slice(1)}`;

    // ── Table component config is upserted on EVERY boot so config
    // changes (e.g. onRowClick) reach databases bootstrapped by earlier
    // versions of this code.
    const tableConfig = {
      datasource: {
        type: "rest",
        endpoint: def.endpoint,
        method: "GET",
        pagination: {
          type: "offset",
          defaultPageSize: 25,
          pageSizeOptions: [10, 25, 50, 100],
        },
        serverSide: true,
      },
      settings: {
        density: "normal",
        striped: true,
        stickyHeader: true,
        searchable: true,
        columnToggle: true,
      },
      ...(def.onRowClick ? { onRowClick: { redirect: def.onRowClick } } : {}),
    };
    const existingTable = await this.componentsRepo.selectOneById(cuids.table);
    if (existingTable) {
      await this.componentsRepo.updateOneById(cuids.table, {
        config: tableConfig,
      } as any);
    } else {
      await this.componentsRepo.createOne({
        id: cuids.table,
        blueprintId: tableBpId,
        name: `${key}_list`,
        displayName: def.label,
        description: null,
        category: "system",
        config: tableConfig,
        pathPattern: null,
        visibleToPermissions: SUPER_ADMIN_ONLY,
        overridesComponentId: null,
        displayOrder: 1,
        tenantId: null,
        isActive: true,
        isSystem: true,
        meta: null,
      });
    }

    const existingScreen = await this.screensRepo.selectOneById(cuids.screen);
    if (existingScreen) return; // screen/widgets already bootstrapped

    // Page component
    if (!(await this.componentsRepo.selectOneById(cuids.page))) {
      await this.componentsRepo.createOne({
        id: cuids.page,
        blueprintId: pageBpId,
        name: `${key}_page`,
        displayName: def.label,
        description: null,
        category: "system",
        config: {},
        pathPattern: null,
        visibleToPermissions: SUPER_ADMIN_ONLY,
        overridesComponentId: null,
        displayOrder: 1,
        tenantId: null,
        isActive: true,
        isSystem: true,
        meta: null,
      });
    }

    // Elements: page → table ref + column definitions
    await this.componentsRepo.insertElements([
      {
        id: cuids.ref,
        componentId: cuids.page,
        slotName: pageSlot,
        elementType: "component_ref",
        referencedComponentId: cuids.table,
        paramBindings: {},
        grid: { row: 1, col: 1, colSpan: 12 },
        displayOrder: 1,
        isActive: true,
      },
      ...def.columns.map((col, i) => ({
        id: cuids[`col${col.name.charAt(0).toUpperCase()}${col.name.slice(1)}`],
        componentId: cuids.table,
        slotName: columnsSlot,
        elementType: "field" as const,
        overrides: {
          name: col.name,
          displayName: col.label,
          columnConfig: {
            width: col.width ?? (col.format === "date" ? 160 : 180),
            sortable: true,
            filterable: col.format !== "date",
            format: { type: col.format ?? "text" },
          },
        },
        displayOrder: i + 1,
        isActive: true,
      })),
    ]);

    // Screen + widget
    await this.screensRepo.createOne({
      id: cuids.screen,
      moduleId,
      parentScreenId: null,
      name: def.key,
      displayName: def.label,
      icon: "ViewList",
      tenantId: null,
      overridesScreenId: null,
      displayOrder: index + 1,
      isActive: true,
      meta: null,
      pathPattern: null,
      visibleToPermissions: SUPER_ADMIN_ONLY,
    });
    await this.widgetsRepo.createOne({
      id: cuids.widget,
      screenId: cuids.screen,
      widgetType: "page",
      resourceId: cuids.page,
      displayOrder: 1,
      widgetOverrides: { title: def.label, sizeHint: "full" },
      config: {},
      tenantId: null,
      overridesWidgetId: null,
      isActive: true,
      meta: null,
    });

    	this.logger.log(`Metadata screen '${def.key}' bootstrapped`);
  }

	  /**
	   * Screen-detail page: `/dashboard/metadata/screens/:screenId`.
	   * Renders a visual tree of the screen's components (via
	   * GET /api/v1/screens/:id/tree) — slots, grid positions and field
	   * definitions preserved, so the diagram can later become an editor.
	   */
	  private async ensureScreenDetail(
	    moduleId: number,
	    pageBpId: number,
	    pageSlot: string,
	    treeBpId: number,
	  ): Promise<void> {
	    const cuids = METADATA_MODULE_CUIDS.screenDetail;

	    const treeConfig = {
	      datasource: {
	        endpoint: "/api/v1/screens/{screenId}/tree",
	        method: "GET",
	      },
	      settings: {
	        emptyMessage: "$trl_metadata_no_components",
	      },
	    };

	    // Page component (create once)
	    if (!(await this.componentsRepo.selectOneById(cuids.page))) {
	      await this.componentsRepo.createOne({
	        id: cuids.page,
	        blueprintId: pageBpId,
	        name: "screen_detail_page",
	        displayName: "$trl_metadata_screen_detail",
	        description: null,
	        category: "system",
	        config: {},
	        pathPattern: null,
	        visibleToPermissions: SUPER_ADMIN_ONLY,
	        overridesComponentId: null,
	        displayOrder: 1,
	        tenantId: null,
	        isActive: true,
	        isSystem: true,
	        meta: null,
	      });
	    }

	    // Tree component — config (and blueprint) upserted on EVERY boot so
	    // databases bootstrapped by earlier versions pick up changes.
	    const existingTree = await this.componentsRepo.selectOneById(cuids.list);
	    if (existingTree) {
	      await this.componentsRepo.updateOneById(cuids.list, {
	        blueprintId: treeBpId,
	        config: treeConfig,
	      } as any);
	    } else {
	      await this.componentsRepo.createOne({
	        id: cuids.list,
	        blueprintId: treeBpId,
	        name: "screen_detail_components",
	        displayName: "$trl_metadata_screen_components",
	        description: null,
	        category: "system",
	        config: treeConfig,
	        pathPattern: null,
	        visibleToPermissions: SUPER_ADMIN_ONLY,
	        overridesComponentId: null,
	        displayOrder: 1,
	        tenantId: null,
	        isActive: true,
	        isSystem: true,
	        meta: null,
	      });
	    }

	    // Element: page body → tree, bound to the route's screenId
	    await this.componentsRepo.insertElements([
	      {
	        id: cuids.ref,
	        componentId: cuids.page,
	        slotName: pageSlot,
	        elementType: "component_ref",
	        referencedComponentId: cuids.list,
	        paramBindings: {
	          screenId: { source: "route_param", value: "screenId" },
	        },
	        grid: { row: 1, col: 1, colSpan: 12 },
	        displayOrder: 1,
	        isActive: true,
	      },
	    ]);

	    const existingScreen = await this.screensRepo.selectOneById(cuids.screen);
	    if (existingScreen) return; // screen/widgets already bootstrapped

	    // Screen (inner — hidden from the sidebar via its pathPattern)
	    await this.screensRepo.createOne({
	      id: cuids.screen,
	      moduleId,
	      parentScreenId: METADATA_MODULE_CUIDS.screens.screen,
	      name: "screen-detail",
	      displayName: "$trl_metadata_screen_detail",
	      icon: "ViewList",
	      tenantId: null,
	      overridesScreenId: null,
	      displayOrder: 10,
	      isActive: true,
	      meta: null,
	      pathPattern: "screens/:screenId",
	      visibleToPermissions: SUPER_ADMIN_ONLY,
	    });
	    await this.widgetsRepo.createOne({
	      id: cuids.widget,
	      screenId: cuids.screen,
	      widgetType: "page",
	      resourceId: cuids.page,
	      displayOrder: 1,
	      widgetOverrides: { title: "$trl_metadata_screen_detail", sizeHint: "full" },
	      config: {},
	      tenantId: null,
	      overridesWidgetId: null,
	      isActive: true,
	      meta: null,
	    });

	    this.logger.log("Metadata screen-detail bootstrapped");
	  }

	  /**
	   * Module-detail page: `/dashboard/metadata/modules/:moduleId`.
	   * Lists the screens that belong to a module (via
	   * GET /api/v1/screens?moduleId={moduleId}).
	   */
	  private async ensureModuleDetail(
	    moduleId: number,
	    pageBpId: number,
	    pageSlot: string,
	    tableBpId: number,
	    columnsSlot: string,
	  ): Promise<void> {
	    const cuids = METADATA_MODULE_CUIDS.moduleDetail;

	    // Page component (create once)
	    if (!(await this.componentsRepo.selectOneById(cuids.page))) {
	      await this.componentsRepo.createOne({
	        id: cuids.page,
	        blueprintId: pageBpId,
	        name: "module_detail_page",
	        displayName: "$trl_metadata_module_detail",
	        description: null,
	        category: "system",
	        config: {},
	        pathPattern: null,
	        visibleToPermissions: SUPER_ADMIN_ONLY,
	        overridesComponentId: null,
	        displayOrder: 1,
	        tenantId: null,
	        isActive: true,
	        isSystem: true,
	        meta: null,
	      });
	    }

	    // Screens table — config upserted on EVERY boot so config
	    // changes reach databases bootstrapped by earlier versions.
	    const tableConfig = {
	      datasource: {
	        type: "rest",
	        endpoint: "/api/v1/screens?moduleId={moduleId}",
	        method: "GET",
	        pagination: {
	          type: "offset",
	          defaultPageSize: 25,
	          pageSizeOptions: [10, 25, 50, 100],
	        },
	        serverSide: true,
	      },
	      settings: {
	        density: "normal",
	        striped: true,
	        stickyHeader: true,
	        searchable: true,
	        columnToggle: true,
	      },
	      toolbarActions: [],
	      rowActions: [],
	    };
	    const existingTable = await this.componentsRepo.selectOneById(cuids.table);
	    if (existingTable) {
	      await this.componentsRepo.updateOneById(cuids.table, {
	        config: tableConfig,
	      } as any);
	    } else {
	      await this.componentsRepo.createOne({
	        id: cuids.table,
	        blueprintId: tableBpId,
	        name: "module_detail_screens",
	        displayName: "$trl_metadata_module_screens",
	        description: null,
	        category: "system",
	        config: tableConfig,
	        pathPattern: null,
	        visibleToPermissions: SUPER_ADMIN_ONLY,
	        overridesComponentId: null,
	        displayOrder: 1,
	        tenantId: null,
	        isActive: true,
	        isSystem: true,
	        meta: null,
	      });
	    }

	    // Elements: page → table ref (moduleId from the route) + columns
	    await this.componentsRepo.insertElements([
	      {
	        id: cuids.ref,
	        componentId: cuids.page,
	        slotName: pageSlot,
	        elementType: "component_ref",
	        referencedComponentId: cuids.table,
	        paramBindings: {
	          moduleId: { source: "route_param", value: "moduleId" },
	        },
	        grid: { row: 1, col: 1, colSpan: 12 },
	        displayOrder: 1,
	        isActive: true,
	      },
	      ...(
	        [
	          { id: cuids.colName, name: "name", label: "$trl_name", width: 180 },
	          {
	            id: cuids.colDisplayName,
	            name: "displayName",
	            label: "$trl_display_name",
	            width: 220,
	          },
	          { id: cuids.colIcon, name: "icon", label: "$trl_icon", width: 120 },
	          {
	            id: cuids.colPathPattern,
	            name: "pathPattern",
	            label: "$trl_path_pattern",
	            width: 200,
	          },
	          {
	            id: cuids.colDisplayOrder,
	            name: "displayOrder",
	            label: "$trl_display_order",
	            width: 120,
	          },
	          {
	            id: cuids.colIsActive,
	            name: "isActive",
	            label: "$trl_is_active",
	            width: 100,
	          },
	        ] as const
	      ).map((col, i) => ({
	        id: col.id,
	        componentId: cuids.table,
	        slotName: columnsSlot,
	        elementType: "field" as const,
	        overrides: {
	          name: col.name,
	          displayName: col.label,
	          columnConfig: {
	            width: col.width,
	            sortable: true,
	            filterable: true,
	            format: { type: "text" as const },
	          },
	        },
	        displayOrder: i + 1,
	        isActive: true,
	      })),
	    ]);

	    const existingScreen = await this.screensRepo.selectOneById(cuids.screen);
	    if (existingScreen) return; // screen/widgets already bootstrapped

	    // Screen (inner — hidden from the sidebar via its pathPattern)
	    await this.screensRepo.createOne({
	      id: cuids.screen,
	      moduleId,
	      parentScreenId: METADATA_MODULE_CUIDS.modules.screen,
	      name: "module-detail",
	      displayName: "$trl_metadata_module_detail",
	      icon: "ViewList",
	      tenantId: null,
	      overridesScreenId: null,
	      displayOrder: 11,
	      isActive: true,
	      meta: null,
	      pathPattern: "modules/:moduleId",
	      visibleToPermissions: SUPER_ADMIN_ONLY,
	    });
	    await this.widgetsRepo.createOne({
	      id: cuids.widget,
	      screenId: cuids.screen,
	      widgetType: "page",
	      resourceId: cuids.page,
	      displayOrder: 1,
	      widgetOverrides: { title: "$trl_metadata_module_detail", sizeHint: "full" },
	      config: {},
	      tenantId: null,
	      overridesWidgetId: null,
	      isActive: true,
	      meta: null,
	    });

	    this.logger.log("Metadata module-detail bootstrapped");
	  }
	}
