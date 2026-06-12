import { relations } from "drizzle-orm";
import { boolean, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";

/**
 * Parameter source — where a value originates in the resolution pipeline.
 *
 * - `literal`   — hardcoded value set at design time
 * - `scope`     — global auth context (tenantId, userId, etc.)
 * - `screen`    — provided by the screen the widget lives on
 * - `route_param`— extracted from the URL path pattern (e.g. :formId)
 * - `query_param`— extracted from the URL query string (e.g. ?from=...)
 * - `redux`     — from the Redux store (global app state)
 */
export const PARAM_SOURCES = [
  "literal",
  "scope",
  "screen",
  "route_param",
  "query_param",
  "redux",
] as const;

export type TParamSource = (typeof PARAM_SOURCES)[number];

/**
 * A single parameter declaration within a widget contract.
 */
export interface IWidgetParam {
  /** Parameter name (e.g. "tableId", "serviceId", "startDate") */
  name: string;
  /** Where this parameter is expected to come from during resolution */
  source: TParamSource;
  /** Whether this parameter must be provided for the widget to render */
  required: boolean;
  /** Human-readable description for the drag-and-drop UI */
  description?: string;
  /** Default value if not provided */
  defaultValue?: unknown;
}

/**
 * WIDGET CONTRACTS
 *
 * Each row declares what parameters a widget type (and optionally a
 * specific resource) needs in order to render.  The frontend uses
 * these contracts during screen composition to show the user exactly
 * what inputs a widget expects.
 *
 * ## Generic vs. resource-specific contracts
 *
 * - `resourceId = null` → the contract applies to **all** widgets of
 *   this type.  Example: every table widget needs `tableId`.
 * - `resourceId` set      → the contract applies only when this
 *   specific resource is used.  Example: the "Service Devices" table
 *   widget also needs `serviceId` in addition to `tableId`.
 *
 * Contracts are merged at render time — the resource-specific
 * contract is layered on top of the generic contract.  If both define
 * the same param name, the resource-specific one wins (tenant
 * override pattern).
 *
 * ## Two-layer tenant model
 *
 * - `tenantId = null` → system contract, visible to all tenants.
 * - `tenantId` set    → tenant-specific contract (net-new or override).
 */
export const widgetContracts = pgTable("widget_contracts", {
  ...ids,
  ...timestamps,

  // ── What this contract applies to ────────────────────────────
  widgetType: varchar("widget_type", {
    length: 50,
    enum: ["table", "form", "chart", "info", "report", "tabs"],
  }).notNull(),

  resourceId: varchar("resource_id", { length: 24 }),

  // ── Parameter declarations ──────────────────────────────────
  params: json("params").$type<IWidgetParam[]>().notNull(),

  // ── Tenant isolation ─────────────────────────────────────────
  tenantId: varchar("tenant_id", { length: 24 }),

  // ── Status ───────────────────────────────────────────────────
  isActive: boolean("is_active").default(true).notNull(),

  // ── Metadata ─────────────────────────────────────────────────
  meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const widgetContractsRelations = relations(widgetContracts, () => ({}));
