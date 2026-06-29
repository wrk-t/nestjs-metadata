import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { ids } from "../../helpers/ids";
import { timestamps } from "../../helpers/timestamps";
import { archComponentElements } from "./componentElements";
import { archComponentOverrides } from "./componentOverrides";

// ──────────────────────────────────────────────────────────────────
// Component blueprint definition (stored as JSON on blueprint rows)
// ──────────────────────────────────────────────────────────────────

export interface IBlueprintSlot {
  /** Slot name — e.g. "columns", "body", "actions" */
  name: string;
  displayName?: string;
  description?: string;
  /** Blueprint names or special keywords accepted in this slot */
  accepts: string[];
  /** Min/max children in this slot */
  min?: number;
  max?: number | null;
  /** Layout strategy for children in this slot */
  grid?: "flow" | "css-grid" | "none";
  /** Paths within elements that tenants can override */
  overridable?: string[];
}

export interface IBlueprintContractParam {
  name: string;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

export interface IBlueprintContractOutput {
  name: string;
  type: string;
  description?: string;
}

export interface IBlueprintDef {
  /** Named containers that accept children of specific types */
  slots?: IBlueprintSlot[];
  /** Dot-notation paths tenants can override at component level */
  overridable?: string[];
  /** What params this component needs and provides */
  contract?: {
    inputs?: IBlueprintContractParam[];
    outputs?: IBlueprintContractOutput[];
  };
}

// ──────────────────────────────────────────────────────────────────
// Permission visibility entry
// ──────────────────────────────────────────────────────────────────

export interface IPermissionVisibility {
  resource: string;
  action: string;
  scope?: "own" | "tenant" | "all";
}

// ──────────────────────────────────────────────────────────────────
// arch_components — unified component table
// ──────────────────────────────────────────────────────────────────
//
// Each row is either a blueprint (kind = "blueprint") or an instance
// (kind = "instance") of a blueprint.
//
// Blueprints declare:
//   - slots:   what named containers this type exposes
//   - overridable: what tenants can customise
//   - contract: input/output parameter declarations
//
// Instances:
//   - reference a blueprint via blueprintId
//   - carry concrete config (datasource, settings, actions, pathPattern)
//   - contain elements (children) in arch_component_elements
//   - can nest via parentComponentId (pages contain tables, etc.)

export const archComponents = pgTable("arch_components", {
  ...ids,
  ...timestamps,

  // ── Row kind ─────────────────────────────────────────────────
  kind: varchar("kind", {
    length: 16,
    enum: ["blueprint", "instance"],
  }).notNull(),

  // ── Identity ─────────────────────────────────────────────────
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  category: varchar("category", { length: 100 }),

  // ── Blueprint definition (null for instances) ─────────────────
  // Only populated when kind = "blueprint". Declares the slots,
  // override surface, and parameter contract for this component type.
  blueprintDef: json("blueprint_def").$type<IBlueprintDef>(),

  // ── Instance fields (null for blueprints) ────────────────────
  // Which blueprint this instance conforms to.
  blueprintId: varchar("blueprint_id", { length: 24 }),

  // Parent in the composition hierarchy.
  // A page contains tables/forms; a table may contain a form via
  // component_ref elements — this column tracks the direct nesting
  // where the instance is the *content* of a parent (e.g. tab pages).
  parentComponentId: varchar("parent_component_id", { length: 24 }),

  // Type-specific configuration (null for blueprints).
  // - pages:   { layout: "grid", … }
  // - forms:   { datasource, settings, actions, … }
  // - tables:  { datasource, settings, actions, … }
  // - charts:  { type, axes, … }
  config: json("config").$type<Record<string, unknown>>(),

  // ── Page-specific ────────────────────────────────────────────
  // URL path pattern for page-type components, e.g. "/customers/:id"
  pathPattern: varchar("path_pattern", { length: 500 }),

  // Permission-based visibility (pages only)
  visibleToPermissions:
    json("visible_to_permissions").$type<IPermissionVisibility[]>(),

  // ── Override chain ───────────────────────────────────────────
  // Self-referencing override: a tenant row with this set extends
  // the referenced component. Null fields = "use base value".
  overridesComponentId: varchar("overrides_component_id", { length: 24 }),

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

export const archComponentsRelations = relations(archComponents, ({ one, many }) => ({
  // Instance → blueprint
  blueprint: one(archComponents, {
    fields: [archComponents.blueprintId],
    references: [archComponents.id],
    relationName: "blueprint",
  }),
  // Parent component (direct nesting)
  parent: one(archComponents, {
    fields: [archComponents.parentComponentId],
    references: [archComponents.id],
    relationName: "parent",
  }),
  // Override source
  overridesSource: one(archComponents, {
    fields: [archComponents.overridesComponentId],
    references: [archComponents.id],
    relationName: "overridesSource",
  }),
  // Elements belonging to this component
  elements: many(archComponentElements),
  // Override rows targeting this component
  overrides: many(archComponentOverrides),
}));
