import { relations } from "drizzle-orm";
import { integer, json, pgTable, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { ids } from "../../helpers/ids";
import { timestamps } from "../../helpers/timestamps";
import { archComponents } from "./components";
import { archComponentElements } from "./componentElements";

// ──────────────────────────────────────────────────────────────────
// arch_component_overrides — tenant-level customisation
// ──────────────────────────────────────────────────────────────────
//
// Each row overrides either a component instance or a specific
// element within a component instance, scoped to a single tenant.
//
//   componentId + elementId=null  → component-level override
//     (displayName, config.settings, config.actions, …)
//
//   componentId + elementId=set   → element-level override
//     (width, visibility, isRequired, rendererConfig, …)
//
// The override keys must match paths declared in the blueprint's
// overridable (component-level) or slot.overridable (element-level).
// Validation happens at write time in the service layer.

export const archComponentOverrides = pgTable(
  "arch_component_overrides",
  {
    ...ids,
    ...timestamps,

    	// ── Target ────────────────────────────────────────────────
    	componentId: integer("component_id")
    		.notNull()
    		.references(() => archComponents.id, { onDelete: "cascade" }),

    	// Null → component-level. Set → element-level.
    	elementId: integer("element_id").references(
    		() => archComponentElements.id,
    		{ onDelete: "cascade" },
    	),

    // ── Tenant ─────────────────────────────────────────────────
    tenantId: varchar("tenant_id", { length: 24 }).notNull(),

    	// ── Override values ────────────────────────────────────────
    	// Dot-notation path → value. Only declared paths are valid.
    	// Example: { "displayName": "ACME Customers", "config.settings.density": "compact" }
    	overrides: json("overrides").$type<Record<string, unknown>>().notNull(),

    // ── Metadata ───────────────────────────────────────────────
    meta: json("meta").$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    // One override row per (component, optional-element, tenant).
    // Service layer additionally enforces: only one row where elementId IS NULL
    // per (componentId, tenantId) to prevent duplicate component-level overrides.
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
