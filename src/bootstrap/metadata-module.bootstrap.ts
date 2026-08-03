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
  module: "bi2iuk57olbcutokk5euezjz",
  entities: {
    screen: "y4zichc0lp61rbo9m5lcviz3",
    widget: "dfbmz71y9h7f24o6e4qnhe0i",
    page: "lp4li6ws9irpgfgtpmyrs1ey",
    table: "v3z103wiatmsqyphj9bw365a",
    ref: "qje786ztqm7oy74pq1tfgc3o",
    colName: "vu6dtf7ocyoxu672q3xd14di",
    colTableName: "tupjkuuy8q12ptspq1gnsglc",
    colDisplayName: "jjz85p73r1d0ftjn77z50tt3",
    colDescription: "emw2v7dp0e9jf6z4wxf7ehh3",
    colIsActive: "qbo33ktpohoupv5uzftk8725",
  },
  features: {
    screen: "b7mkf096iufjld6ds0n6muc2",
    widget: "hct2tv894icw3ou2bc7puhvy",
    page: "exqu0wqfzx6xk495prgld9mj",
    table: "s4elzxcagkdbdl34j2clsrh5",
    ref: "fnr8cogt3rnm2gnzdglt82vb",
    colName: "z9uneiqlo21obx9v8zvwst2z",
    colDisplayName: "dttbo72j1cx1iu3672gsfawd",
    colDescription: "zthuq0ccx9q9ziqhk3ua3pog",
    colIsActive: "iv6s0yhypos4t783i63dagax",
  },
  modules: {
    screen: "n0t5qsx8dk88a7it6203om40",
    widget: "irw0gqvj8d9dhvpyl4xy9wfp",
    page: "hw57yl5kqmnkghy7n2oh4zp1",
    table: "qyd55zvz5lrlnc20e46kg00g",
    ref: "uomt0ji0pqclzabcoqst7ckr",
    colName: "dg70l2x60belr2zxjn5jf0nb",
    colDisplayName: "stlra12y51m0rk9ppp5rvl0u",
    colIcon: "jmxbapzn96ddgbkmr4l54ucr",
    colDisplayOrder: "oh20oqh3zpruuowi10nwh485",
    colIsActive: "qq9jz471hfunxxajul34drwp",
  },
  screens: {
    screen: "zs0ribjgzol8cxfwny2y8c3h",
    widget: "e31tv78qan72c3yhu83b88hj",
    page: "sx4ov9fjn2g95h5862dtrdeh",
    table: "vdaufzp3twsg0fqf9pbpa0sb",
    ref: "ribwvfvef3bwq0gf4fy9rtwq",
    colName: "zihiohxafy4gy6i1tyfurp1e",
    colDisplayName: "kmvy4qezirywndow3q4syqog",
    colIcon: "vz4rgka4x6blfhaf9bjhg3vc",
    colPathPattern: "j35762wbccirzhkrtzrai6z9",
    colDisplayOrder: "nwrhfdai33skd9s9dwpsmxl3",
    colIsActive: "pppbtdawnr33evtit9ssroka",
  },
  screenWidgets: {
    screen: "l6swg6s68yw2t7tm0d49p3hs",
    widget: "k6c01weyb59bmfq4nrashj8d",
    page: "eg47mvhhme3n01ezli1pfhru",
    table: "omwpzb4t172kmc1mozm3itp5",
    ref: "p11uh6jg1jhbcm7665mwyuwt",
    colScreenId: "kpduvgfaekapjhkgpkwtiq8v",
    colWidgetType: "sjk2llvty5rhwpf249s1xkqf",
    colDisplayOrder: "oh3bm6hu12sfwz6cqveb9uwg",
    colIsActive: "m94045yzusffgb6gva7a7a7c",
  },
  screenContexts: {
    screen: "pvqfyphg8lsjygp0jmr4xc99",
    widget: "ld21b7ato2e7mdn333wsr90q",
    page: "w0riendcm6aijtxbk6llmx45",
    table: "zex9pkbi3mc9vylkc8psxe12",
    ref: "rst9lxs8h21a99bhw0g2vflh",
    colName: "s67wrsfhrc9llfz4ky95o74c",
    colSource: "l6m4fmxss0lwjxxlfo9dsmu6",
    colKey: "xd2b3p91jaul07imtr94ro6f",
    colIsActive: "cpctn62glssj1n49m1mhfmwx",
  },
  components: {
    screen: "ffgxxv65ac5pm89gk1e0pd6k",
    widget: "ba4xsaeyrx32e8owqhu2ty44",
    page: "iuvkpv2h1x750ri53lus598k",
    table: "fdev4gtely8sdtxyv87jap8q",
    ref: "zhg2imkwjh0653ada5k6dyi3",
    colName: "jp0ivlizd8n23m9ggp3x50r6",
    colDisplayName: "qi9n1jt3u33hsdpn1zb7pgpd",
    colDisplayOrder: "a8srf99x25xayvh7u0bn2yf3",
    colIsActive: "b7d1y2dab5xq5kxek3etkdze",
  },
  fieldDefinitions: {
    screen: "xslc2xkdrhy46n7158cryh3h",
    widget: "y3t3laycmxapowoyncl4btwq",
    page: "g7t7mafscv4h5je64la2cu8a",
    table: "pawtmn3ee8ji3l6cuub5vwqm",
    ref: "u4kswm03giv85px6ru2xzduc",
    colName: "nbt32pf9r72nt3bhrd5zta75",
    colDisplayName: "zfjj05e57ex4h6grioegmz68",
    colType: "c85e7i6wzbxgeh6ya2dnkvox",
    colIsActive: "mtafic48pgoxs2o2zntwuiv7",
  },
  uiComponents: {
    screen: "situzn2lhnvoplzwpb83m2ty",
    widget: "x5tz0uzh2ev8huvfh7y7n5wl",
    page: "drrmxxrmh90ih302gxq7m290",
    table: "vlpeyg1gr7rcsu59sa3en82c",
    ref: "kd4547cppmjym9cq7jyw5jtu",
    colName: "y2coegviu7cg6d7r8nx3scp0",
    colDisplayName: "c7lmfukopbnn7iqy861um4m9",
    colType: "v2e1ynf0onbbqrp4bz3a0urj",
    colIsActive: "dmr4cubfxirf08zw0bxxu12n",
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
  }

  private async ensureTable(
    def: MetadataTableDef,
    index: number,
    moduleId: string,
    pageBpId: string,
    tableBpId: string,
    pageSlot: string,
    columnsSlot: string,
  ): Promise<void> {
    const cuids = METADATA_MODULE_CUIDS[
      def.key as keyof typeof METADATA_MODULE_CUIDS
    ] as Record<string, string>;
    const key = `metadata${def.key.charAt(0).toUpperCase()}${def.key.slice(1)}`;

    const existingScreen = await this.screensRepo.selectOneById(cuids.screen);
    if (existingScreen) return; // already bootstrapped

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

    // Table component (read-only — no toolbar/row actions)
    if (!(await this.componentsRepo.selectOneById(cuids.table))) {
      await this.componentsRepo.createOne({
        id: cuids.table,
        blueprintId: tableBpId,
        name: `${key}_list`,
        displayName: def.label,
        description: null,
        category: "system",
        config: {
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
        },
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
}
