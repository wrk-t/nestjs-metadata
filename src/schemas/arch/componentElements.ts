import { relations } from "drizzle-orm";
import { boolean, integer, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../../helpers/ids";
import { timestamps } from "../../helpers/timestamps";
import { archComponents } from "./components";
import { archComponentBlueprints } from "./componentBlueprints";
import { fieldDefinitions } from "../fieldDefinitions";
import { uiComponents } from "../uiComponents";

// ──────────────────────────────────────────────────────────────────
// Param binding — resolves a child component's input from context
// ──────────────────────────────────────────────────────────────────

export interface IElementParamBinding {
  /** Where the value originates */
  source:
    "literal" | "scope" | "route_param" | "query_param" | "parent_context";
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
// arch_component_elements — children within a component instance
// ──────────────────────────────────────────────────────────────────
//
// Each row fills one slot on a component instance. The elementType
// determines what kind of child it is:
//
//   "field"         → a form field or table column. References a
//                     field_definition and optionally a ui_component.
//
//   "component_ref" → references another component instance to embed
//                     it inside this component. For example:
//                     - a "section" component inside a form
//                     - a "table" component inside a page
//                     - a "chart" component inside a dashboard
//
//   "renderer"      → references a component blueprint (not instance)
//                     for leaf rendering: badge, button, chart-cell,
//                     image. The rendererConfig carries instance-
//                     specific params (color, field, etc.).
//
// Elements do NOT nest — if a section contains fields, those fields
// are elements of the section component, not children of an element.
// Composition is always component → elements, never element → elements.

export const archComponentElements = pgTable("arch_component_elements", {
  ...ids,
  ...timestamps,

  	// ── Parent component ─────────────────────────────────────────
  	componentId: integer("component_id")
  		.notNull()
  		.references(() => archComponents.id, { onDelete: "cascade" }),

  // ── Which blueprint slot this element fills ──────────────────
  // Must match a slot name declared in the component's blueprint.
  // e.g. "columns", "body", "toolbar", "content"
  slotName: varchar("slot_name", { length: 100 }).notNull(),

  // ── Element type ─────────────────────────────────────────────
  elementType: varchar("element_type", {
    length: 20,
    enum: ["field", "component_ref", "renderer"],
  }).notNull(),

  	// ── For "field" type ─────────────────────────────────────────
  	fieldDefinitionId: integer("field_definition_id").references(
  		() => fieldDefinitions.id,
  		{ onDelete: "set null" },
  	),

  	// Optional UI component override for this field/column
  	uiComponentId: integer("ui_component_id").references(
  		() => uiComponents.id,
  		{ onDelete: "set null" },
  	),

  	// ── For "component_ref" type ─────────────────────────────────
  	// References another component instance to embed.
  	// e.g. a page referencing a table, a form referencing a section.
  	referencedComponentId: integer("referenced_component_id").references(
  		() => archComponents.id,
  		{ onDelete: "cascade" },
  	),

  // How the parent resolves the child's contract inputs.
  // e.g. { "tableId": { source: "literal", value: "tbl_abc" } }
  paramBindings:
    json("param_bindings").$type<Record<string, IElementParamBinding>>(),

  	// ── For "renderer" type ──────────────────────────────────────
  	// References a component blueprint (not an instance) — e.g. "badge",
  	// "chart-cell", "action-button". These are leaf renderers with no
  	// slots or children of their own.
  	rendererBlueprintId: integer("renderer_blueprint_id").references(
  		() => archComponentBlueprints.id,
  		{ onDelete: "restrict" },
  	),

  // Instance-specific renderer config (e.g. badge color, chart type)
  rendererConfig: json("renderer_config").$type<Record<string, unknown>>(),

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
// Relations
// ──────────────────────────────────────────────────────────────────

export const archComponentElementsRelations = relations(
  archComponentElements,
  ({ one }) => ({
    // Parent component instance
    component: one(archComponents, {
      fields: [archComponentElements.componentId],
      references: [archComponents.id],
    }),
    // For "component_ref": the embedded component instance
    referencedComponent: one(archComponents, {
      fields: [archComponentElements.referencedComponentId],
      references: [archComponents.id],
      relationName: "referencedComponent",
    }),
    // For "renderer": the renderer blueprint
    rendererBlueprint: one(archComponentBlueprints, {
      fields: [archComponentElements.rendererBlueprintId],
      references: [archComponentBlueprints.id],
      relationName: "rendererBlueprint",
    }),
    // For "field": the field definition
    fieldDefinition: one(fieldDefinitions, {
      fields: [archComponentElements.fieldDefinitionId],
      references: [fieldDefinitions.id],
    }),
    // For "field": optional UI component override
    uiComponent: one(uiComponents, {
      fields: [archComponentElements.uiComponentId],
      references: [uiComponents.id],
    }),
  }),
);
