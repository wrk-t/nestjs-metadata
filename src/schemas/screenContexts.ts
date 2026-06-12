import { relations } from "drizzle-orm";
import { boolean, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { screens } from "./screens";

/**
 * Parameter source — where the screen obtains this value.
 *
 * - `route_param` — extracted from the URL path pattern (e.g. :formId)
 * - `query_param` — extracted from the URL query string (e.g. ?from=...)
 * - `scope`       — global auth context (tenantId, userId, roles)
 * - `redux`       — from the Redux store
 * - `literal`     — hardcoded constant
 */
export const SCREEN_PARAM_SOURCES = [
  "route_param",
  "query_param",
  "scope",
  "redux",
  "literal",
] as const;

export type TScreenParamSource = (typeof SCREEN_PARAM_SOURCES)[number];

/**
 * A single context parameter that a screen provides to its widgets.
 */
export interface IScreenContextParam {
  /** Parameter name (e.g. "serviceId", "startDate") */
  name: string;
  /** Where the screen obtains this value */
  source: TScreenParamSource;
  /** The key used to extract the value from the source.
   *  e.g. for `route_param`, this is the route param name
   *  e.g. for `query_param`, this is the query string key
   *  e.g. for `scope`, this is the scope key ("tenantId", "userId") */
  key: string;
  /** Optional description for the drag-and-drop UI */
  description?: string;
  /** Whether this param is always available (true) or conditional */
  required: boolean;
}

/**
 * SCREEN CONTEXTS
 *
 * Each row declares what parameters a specific screen exposes to its
 * child widgets.  During screen rendering, the frontend uses this
 * information to resolve widget parameter bindings.
 *
 * A screen can publish multiple context parameters of different
 * source types — for example, a detail screen might extract
 * `serviceId` from the URL path and `tenantId` from the auth scope.
 *
 * ## Example
 *
 * A screen with `pathPattern = "services/:serviceId"` would declare:
 * ```json
 * {
 *   "params": [
 *     { "name": "serviceId", "source": "route_param", "key": "serviceId" },
 *     { "name": "tenantId", "source": "scope", "key": "tenantId" }
 *   ]
 * }
 * ```
 *
 * Widgets on this screen can then bind their own params to these
 * exported values.
 *
 * ## Two-layer tenant model
 *
 * - `tenantId = null` → system context, visible to all tenants.
 * - `tenantId` set    → tenant-specific context (override or net-new).
 */
export const screenContexts = pgTable("screen_contexts", {
  ...ids,
  ...timestamps,

  // ── Parent screen ────────────────────────────────────────────
  screenId: varchar("screen_id", { length: 24 })
    .notNull()
    .references(() => screens.id, { onDelete: "cascade" }),

  // ── Parameter exports ────────────────────────────────────────
  params: json("params").$type<IScreenContextParam[]>().notNull(),

  // ── Tenant isolation ─────────────────────────────────────────
  tenantId: varchar("tenant_id", { length: 24 }),

  // ── Status ───────────────────────────────────────────────────
  isActive: boolean("is_active").default(true).notNull(),

  // ── Metadata ─────────────────────────────────────────────────
  meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const screenContextsRelations = relations(screenContexts, ({ one }) => ({
  screen: one(screens, {
    fields: [screenContexts.screenId],
    references: [screens.id],
  }),
}));
