import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  pgTable,
  varchar,
} from "drizzle-orm/pg-core";
import { ids } from "../../helpers/ids";
import { timestamps } from "../../helpers/timestamps";
import { archComponents } from "./components";
import { fieldDefinitions } from "../fieldDefinitions";
import { uiComponents } from "../uiComponents";

// ──────────────────────────────────────────────────────────────────
// Param binding — how a component_ref element resolves a child's
// input parameter from available context sources.
// ──────────────────────────────────────────────────────────────────

export interface IElementParamBinding {
  /** Where the value originates */
  source: "literal" | "scope" | "route_param" | "query_param" | "parent_context";
  /** For literal: the hardcoded value. For others: the key to look up. */
  value?: string;
}

// ──────────────────────────────────────────────────────────────────
// Grid placement — used when the parent slot uses css-grid layout
// ──────────────────────────────────────────────────────────────────

export interface IElementGrid {
  row?: number;
  col?: number;
  rowSpan?: number;
  colSpan?: number;
}

// ──────────────────────────────────────────────────────────────────
// arch_component_elements — filled slots within a component instance
// ──────────────────────────────────────────────────────────────────
//
// Each row is one child of a component instance. The elementType
// determines what kind of child it is:
//
//   "field"          → form field / table column referencing a
//                      field_definition and optionally a ui_component
//   "section"        → grouping container; children point to it via
//                      parentElementId
//   "component_ref"  → references another component instance (a table
//                      embedded in a page, a form opened from a table)
//   "renderer"       → references a renderer-type blueprint (badge,
//                      chart-cell, button, image — presentation only)

export const archComponentElements = pgTable("arch_component_elements", {
  ...ids,
  ...timestamps,

  // ── Parent component ─────────────────────────────────────────
  componentId: varchar("component_id", { length: 24 })
    .notNull()
    .references(() => archComponents.id, { onDelete: "cascade" }),

  // ── Which blueprint slot this element fills ──────────────────
  // Matches a slot name declared in the blueprint's blueprintDef.slots.
  // Null for simple components that don't declare slots.
  slotName: varchar("slot_name", { length: 100 }),

  // ── Element type ─────────────────────────────────────────────
  elementType: varchar("element_type", {
    length: 20,
    enum: ["field", "section", "component_ref", "renderer"],
  }).notNull(),

  // ── For "field" type ─────────────────────────────────────────
  fieldDefinitionId: varchar("field_definition_id", { length: 24 })
    .references(() => fieldDefinitions.id, { onDelete: "set null" }),

  // UI component override for this field/column
  uiComponentId: varchar("ui_component_id", { length: 24 })
    .references(() => uiComponents.id, { onDelete: "set null" }),

  // ── For "component_ref" type ─────────────────────────────────
  // References another component instance (a table in a page,
  // a form opened from a row action, a chart in a dashboard).
  referencedComponentId: varchar("referenced_component_id", { length: 24 })
    .references(() => archComponents.id, { onDelete: "cascade" }),

  // Param bindings — how the parent resolves the child's inputs
  paramBindings:
    json("param_bindings").$type<Record<string, IElementParamBinding>>(),

  // ── For "renderer" type ──────────────────────────────────────
  // References a renderer-type blueprint (e.g. "badge", "chart-cell")
  rendererComponentId: varchar("renderer_component_id", { length: 24 })
    .references(() => archComponents.id, { onDelete: "cascade" }),

  // Renderer-specific configuration (e.g. badge color, chart type)
  rendererConfig: json("renderer_config").$type<Record<string, unknown>>(),

  // ── Nesting (for "section" type) ─────────────────────────────
  // Elements that belong to a section point to the section row.
  // Sections can nest: a section element can itself have a parentElementId.
  parentElementId: varchar("parent_element_id", { length: 24 }),

  // ── Element-level overrides ──────────────────────────────────
  // Bounded by the blueprint's slot.overridable declaration.
  // Example paths: "displayName", "isRequired", "columnConfig.width"
  overrides: json("overrides").$type<Record<string, unknown>>(),

  // ── Grid placement ───────────────────────────────────────────
  // For slots using grid="css-grid", this positions the element.
  // For grid="flow", use displayOrder instead.
  grid: json("grid").$type<IElementGrid>(),

  // ── Order ────────────────────────────────────────────────────
  displayOrder: integer("display_order").default(0).notNull(),

  // ── Tenant isolation ─────────────────────────────────────────
  tenantId: varchar("tenant_id", { length: 24 }),

  // ── Status ───────────────────────────────────────────────────
  isActive: boolean("is_active").default(true).notNull(),

  // ── Metadata ─────────────────────────────────────────────────
  meta: json("meta").$type<Record<string, unknown> | null>(),
});

// ──────────────────────────────────────────────────────────────────
// Self-referential relation for section nesting
// ──────────────────────────────────────────────────────────────────

export const archComponentElementsRelations = relations(
  archComponentElements,
  ({ one, many }) => ({
    // Owner component instance
    component: one(archComponents, {
      fields: [archComponentElements.componentId],
      references: [archComponents.id],
    }),
    // Referenced component (for component_ref elements)
    referencedComponent: one(archComponents, {
      fields: [archComponentElements.referencedComponentId],
      references: [archComponents.id],
      relationName: "referencedComponent",
    }),
    // Referenced renderer (for renderer elements)
    rendererComponent: one(archComponents, {
      fields: [archComponentElements.rendererComponentId],
      references: [archComponents.id],
      relationName: "rendererComponent",
    }),
    // Field definition
    fieldDefinition: one(fieldDefinitions, {
      fields: [archComponentElements.fieldDefinitionId],
      references: [fieldDefinitions.id],
    }),
    // UI component
    uiComponent: one(uiComponents, {
      fields: [archComponentElements.uiComponentId],
      references: [uiComponents.id],
    }),
    // Parent element (section nesting)
    parentElement: one(archComponentElements, {
      fields: [archComponentElements.parentElementId],
      references: [archComponentElements.id],
    }),
  }),
);
