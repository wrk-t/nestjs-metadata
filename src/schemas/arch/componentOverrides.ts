import { relations } from "drizzle-orm";
import { json, pgTable, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { ids } from "../../helpers/ids";
import { timestamps } from "../../helpers/timestamps";
import { archComponents } from "./components";
import { archComponentElements } from "./componentElements";

// ──────────────────────────────────────────────────────────────────
// arch_component_overrides — tenant-level customisation
// ──────────────────────────────────────────────────────────────────
//
// Each row overrides either a component instance or a specific
// element within a component instance, scoped to a tenant.
//
//   - componentId + tenantId + elementId=null
//     → component-level override (displayName, config, settings, etc.)
//
//   - componentId + tenantId + elementId=set
//     → element-level override (column width, field visibility, etc.)
//
// The override paths must match the blueprint's overridable or
// slot.overridable declarations. Validation happens in the service
// layer, not as a DB constraint.
//
// Null/omitted keys mean "use the base value" — only explicitly
// set keys in the overrides JSON are applied on top of the base.

export const archComponentOverrides = pgTable(
  "arch_component_overrides",
  {
    ...ids,
    ...timestamps,

    // ── Target ────────────────────────────────────────────────
    componentId: varchar("component_id", { length: 24 })
      .notNull()
      .references(() => archComponents.id, { onDelete: "cascade" }),

    // Null → component-level override. Set → element-level override.
    elementId: varchar("element_id", { length: 24 })
      .references(() => archComponentElements.id, { onDelete: "cascade" }),

    // ── Tenant ─────────────────────────────────────────────────
    tenantId: varchar("tenant_id", { length: 24 }).notNull(),

    // ── Override values ────────────────────────────────────────
    // Only paths declared in the blueprint's overridable or
    // slot.overridable are valid. Keys are dot-notation paths,
    // e.g. { "displayName": "ACME Customers", "config.settings.density": "compact" }
    overrides: json("overrides").$type<Record<string, unknown>>().notNull(),

    // ── Metadata ───────────────────────────────────────────────
    meta: json("meta").$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    // One override row per (component, optional-element, tenant).
    // PostgreSQL treats NULLs as distinct in unique indexes, so
    // this allows one component-level row (elementId = NULL) plus
    // multiple element-level rows per tenant. The service layer
    // enforces "only one component-level override per tenant."
    uniqueOverride: uniqueIndex("uq_arch_override").on(
      table.componentId,
      table.elementId,
      table.tenantId,
    ),
  }),
);

// ──────────────────────────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────────────────────────

export const archComponentOverridesRelations = relations(
  archComponentOverrides,
  ({ one }) => ({
    component: one(archComponents, {
      fields: [archComponentOverrides.componentId],
      references: [archComponents.id],
    }),
    element: one(archComponentElements, {
      fields: [archComponentOverrides.elementId],
      references: [archComponentElements.id],
    }),
  }),
);
