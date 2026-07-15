import { relations } from "drizzle-orm";
import { boolean, integer, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { modules } from "./modules";

/**
 * SCREENS
 *
 * A screen is a single page within a module. Each screen is composed
 * of an ordered list of widgets (tables, forms, charts, info cards,
 * reports) rendered by the frontend as a responsive layout.
 *
 * ## Nesting
 *
 * `parentScreenId` enables nested navigation structures
 * (e.g. "Customers" → "Active Customers", "Archived Customers").
 * Top-level screens (parentScreenId = null) appear as primary
 * sidebar items.
 *
 * ## Two-layer tenant model
 *
 * Same pattern as modules:
 * - `tenantId = null` → a system screen.
 * - `tenantId` set + `overridesScreenId` → tenant override of a
 *   system screen. Tenant wins on collision by name.
 * - `tenantId` set + `overridesScreenId = null` → net-new screen
 *   for a tenant module.
 */
export const screens = pgTable("screens", {
  ...ids,
  ...timestamps,

  // ── Parent ─────────────────────────────────────────────────
  moduleId: varchar("module_id", { length: 24 })
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),

  parentScreenId: varchar("parent_screen_id", { length: 24 }),

  // ── Identity ───────────────────────────────────────────────
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 100 }),

  // ── Tenant isolation ───────────────────────────────────────
  tenantId: varchar("tenant_id", { length: 24 }),

  // ── Override chain ─────────────────────────────────────────
  overridesScreenId: varchar("overrides_screen_id", { length: 24 }),

  // ── Order ──────────────────────────────────────────────────
  displayOrder: integer("display_order").default(0).notNull(),

  // ── Path pattern ────────────────────────────────────────────
  // URL template for this screen. Static screens use a simple
  // name (e.g. "tables"), detail screens use parameterized
  // patterns (e.g. "forms/:formId"). The frontend matches the
  // current URL against these patterns to extract path params.
  pathPattern: varchar("path_pattern", { length: 500 }),

  // ── Permission-based visibility ──
  visibleToPermissions: json("visible_to_permissions").$type<
    Array<{
      resource: string;
      action: string;
      scope?: "own" | "tenant" | "all";
    }>
  >(),

  // ── Status ─────────────────────────────────────────────────
  isActive: boolean("is_active").default(true).notNull(),

  // ── Metadata ───────────────────────────────────────────────
  meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const screensRelations = relations(screens, ({ one }) => ({
  module: one(modules, {
    fields: [screens.moduleId],
    references: [modules.id],
  }),
  parentScreen: one(screens, {
    fields: [screens.parentScreenId],
    references: [screens.id],
  }),
}));
