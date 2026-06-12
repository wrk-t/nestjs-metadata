import { relations } from "drizzle-orm";
import { boolean, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";

/**
 * MODULES
 *
 * Represents a logical grouping of features (tables, forms, etc.) that
 * together form a cohesive application module — e.g. "Customer Management",
 * "Order Processing".
 *
 * ## Two-layer tenant model
 *
 * - `tenantId = null` → a **system module** available to all tenants.
 * - `tenantId` set     → a **tenant-specific** module (custom or override).
 *
 * ### Tenant overrides
 *
 * When `overridesModuleId` points to a system module, the tenant module
 * *extends* the system module:
 * - Screens from the system module are merged with tenant screens.
 * - Where screen names collide, the tenant's screen wins.
 * - A tenant screen with `isActive = false` hides the system screen.
 *
 * When `overridesModuleId` is null and `tenantId` is set, the module is
 * a net-new module visible only to that tenant.
 */
export const modules = pgTable("modules", {
  ...ids,
  ...timestamps,

  // ── Identity ───────────────────────────────────────────────
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  icon: varchar("icon", { length: 100 }),

  // ── Tenant isolation ───────────────────────────────────────
  // null = system module (available to all tenants)
  // non-null = tenant-specific module
  tenantId: varchar("tenant_id", { length: 24 }),

  // ── Override chain ─────────────────────────────────────────
  // When set, this module extends the referenced module.
  // Used for tenant customization of system modules.
  overridesModuleId: varchar("overrides_module_id", { length: 24 }),

  // ── Status ─────────────────────────────────────────────────
  isActive: boolean("is_active").default(true).notNull(),

  // ── Metadata ───────────────────────────────────────────────
  meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const modulesRelations = relations(modules, ({ one }) => ({
  parentModule: one(modules, {
    fields: [modules.overridesModuleId],
    references: [modules.id],
  }),
}));
