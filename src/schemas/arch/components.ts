import { relations } from "drizzle-orm";
import { boolean, integer, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../../helpers/ids";
import { timestamps } from "../../helpers/timestamps";
import { archComponentBlueprints } from "./componentBlueprints";
import { archComponentElements } from "./componentElements";
import { archComponentOverrides } from "./componentOverrides";

// ──────────────────────────────────────────────────────────────────
// Permission visibility entry
// ──────────────────────────────────────────────────────────────────

export interface IPermissionVisibility {
  resource: string;
  action: string;
  scope?: "own" | "tenant" | "all";
}

// ──────────────────────────────────────────────────────────────────
// arch_components — concrete component instances
// ──────────────────────────────────────────────────────────────────
//
// One table for ALL component instances: forms, tables, sections,
// pages, tabs, charts — anything that conforms to a blueprint.
//
// Each row:
//   - references a blueprint (the "class")
//   - carries concrete config (datasource, settings, actions)
//   - contains children via arch_component_elements
//   - can be referenced as a child by other components via
//     elementType: "component_ref" in arch_component_elements

export const archComponents = pgTable("arch_components", {
  ...ids,
  ...timestamps,

  	// ── Blueprint ────────────────────────────────────────────────
  	// Which component type this instance conforms to.
  	blueprintId: integer("blueprint_id")
  		.notNull()
  		.references(() => archComponentBlueprints.id, { onDelete: "restrict" }),

  // ── Identity ─────────────────────────────────────────────────
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  icon: varchar("icon", { length: 100 }),
  category: varchar("category", { length: 100 }),

  // ── Type-specific configuration ──────────────────────────────
  // What goes here depends on the blueprint:
  //   table:  { datasource, settings, actions, selection, … }
  //   form:   { datasource, settings, actions, … }
  //   page:   { layout, … }
  //   chart:  { type, axes, … }
  //   section:{ title, description, collapsible, … }
  config: json("config").$type<Record<string, unknown>>(),

  // ── Page-specific: URL pattern ───────────────────────────────
  // Only meaningful for page-type components.
  // e.g. "/customers/:id", "/settings"
  pathPattern: varchar("path_pattern", { length: 500 }),

  // ── Permission-based visibility (pages) ──────────────────────
  visibleToPermissions: json("visible_to_permissions").$type<
    IPermissionVisibility[]
  >(),

  	// ── Override chain ───────────────────────────────────────────
  	// When set, this component *extends* the referenced component.
  	// Tenant-scoped: a tenant creates a row with this pointing to a
  	// system component. Fields not set here fall back to the base.
  	overridesComponentId: integer("overrides_component_id").references(
  		(): any => archComponents.id,
  	),

  // ── Status ───────────────────────────────────────────────────
  displayOrder: integer("display_order").default(0).notNull(),
  tenantId: varchar("tenant_id", { length: 24 }),
  isActive: boolean("is_active").default(true).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),

  // ── Metadata ─────────────────────────────────────────────────
  meta: json("meta").$type<Record<string, unknown> | null>(),
});

// ──────────────────────────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────────────────────────

export const archComponentsRelations = relations(
  archComponents,
  ({ one, many }) => ({
    // Instance → blueprint
    blueprint: one(archComponentBlueprints, {
      fields: [archComponents.blueprintId],
      references: [archComponentBlueprints.id],
      relationName: "blueprint",
    }),
    // Override source (self-referencing)
    overridesSource: one(archComponents, {
      fields: [archComponents.overridesComponentId],
      references: [archComponents.id],
      relationName: "overridesSource",
    }),
    // Elements belonging to this component
    elements: many(archComponentElements),
    // Override rows targeting this component
    overrides: many(archComponentOverrides),
  }),
);
