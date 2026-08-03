import { relations } from "drizzle-orm";
import { boolean, integer, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import type { TenantRequirement } from "../common/tenant-requirement";

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
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  // ── Visibility ─────────────────────────────────────────────
  // When true, only users with isSuperAdmin can see this module.
  visibleToSuperAdmin: boolean("visible_to_super_admin").default(false).notNull(),

  // ── Tenant-membership visibility ──────────────────────────
  // Controls whether the module is returned based on the user's
  // tenant membership: "any" (default), "tenant" (user must belong
  // to a tenant), or "standalone" (user must have no tenant).
  tenantRequirement: varchar("tenant_requirement", { length: 20 })
    .$type<TenantRequirement>()
    .default("any")
    .notNull(),

  // ── Metadata ───────────────────────────────────────────────
  meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const modulesRelations = relations(modules, ({ one }) => ({
  parentModule: one(modules, {
    fields: [modules.overridesModuleId],
    references: [modules.id],
  }),
}));
