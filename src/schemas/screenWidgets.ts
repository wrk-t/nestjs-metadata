import { relations } from "drizzle-orm";
import { boolean, integer, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { screens } from "./screens";

/**
 * A single parameter binding that maps a widget param to its source.
 */
export interface IWidgetParamBinding {
  /** Where the value comes from */
  source: "literal" | "scope" | "screen";
  /** For `literal`: the hardcoded value.
   *  For `screen` or `scope`: the key to look up. */
  value?: string;
}

/**
 * SCREEN WIDGETS
 *
 * A widget is a single unit on a screen — a table, form, chart,
 * info card, report, or tab container. Widgets are rendered in
 * order by the frontend as a responsive vertical stack.
 *
 * Each widget references a typed resource (e.g. a table ID, a form
 * ID) and can override the resource's default presentation through
 * `widgetOverrides` and type-specific `config`.
 *
 * ## Widget types
 *
 * - `table` / `form` → reference a table/form record in `resourceId`
 * - `chart` / `report` → reference a query record in `resourceId`
 * - `info` → generic info card
 * - `tabs` → tab container; `resourceId` is unused, tab config
 *   lives in `config.tabs` referencing child screens by ID
 *
 * ## Override pattern
 *
 * Following the same pattern as `formElements.fieldOverrides`:
 * - `widgetOverrides` — presentation-level overrides (title, size,
 *   visibility, refresh interval).
 * - `config` — type-specific configuration (hidden columns for
 *   tables, chart type/axes, tab definitions).
 *
 * ## Two-layer tenant model
 *
 * Same pattern as modules and screens:
 * - `tenantId = null` → system widget.
 * - `tenantId` set + `overridesWidgetId` → tenant override.
 * - `tenantId` set + `overridesWidgetId = null` → net-new widget.
 */
export const screenWidgets = pgTable("screen_widgets", {
  ...ids,
  ...timestamps,

  // ── Parent ─────────────────────────────────────────────────
  screenId: varchar("screen_id", { length: 24 })
    .notNull()
    .references(() => screens.id, { onDelete: "cascade" }),

  // ── Type + resource ────────────────────────────────────────
  widgetType: varchar("widget_type", {
    length: 50,
    enum: ["table", "form", "chart", "info", "report", "tabs", "button", "page"],
  }).notNull(),

  resourceId: varchar("resource_id", { length: 24 }),

  // ── Order ──────────────────────────────────────────────────
  displayOrder: integer("display_order").default(0),

  // ── Presentation overrides ─────────────────────────────────
  widgetOverrides: json("widget_overrides").$type<{
    title?: string;
    description?: string;
    sizeHint?: "small" | "medium" | "large" | "full";
    collapsedByDefault?: boolean;
    refreshInterval?: number;
    hiddenOn?: "mobile" | "desktop";
  }>(),

  // ── Type-specific configuration ────────────────────────────
  config: json("config").$type<Record<string, unknown>>(),

  // ── Parameter bindings ──────────────────────────────────────
  // Maps widget param names → their resolved source.
  // e.g. { "tableId": { "source": "literal", "value": "tbl_abc" },
  //        "serviceId": { "source": "screen", "value": "serviceId" } }
  paramBindings:
    json("param_bindings").$type<Record<string, IWidgetParamBinding>>(),

  // ── Tenant isolation ───────────────────────────────────────
  tenantId: varchar("tenant_id", { length: 24 }),

  // ── Override chain ─────────────────────────────────────────
  overridesWidgetId: varchar("overrides_widget_id", { length: 24 }),

  // ── Status ─────────────────────────────────────────────────
  isActive: boolean("is_active").default(true).notNull(),

  // ── Metadata ───────────────────────────────────────────────
  meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const screenWidgetsRelations = relations(screenWidgets, ({ one }) => ({
  screen: one(screens, {
    fields: [screenWidgets.screenId],
    references: [screens.id],
  }),
}));
