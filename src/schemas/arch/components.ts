import { isNull, relations, sql } from "drizzle-orm";
import {
	boolean,
	integer,
	json,
	pgTable,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { ids } from "../../helpers/ids";
import { timestamps } from "../../helpers/timestamps";
import { archComponentBlueprints } from "./componentBlueprints";
import { archComponentElements } from "./componentElements";

// ──────────────────────────────────────────────────────────────────
// Permission visibility entry
// ──────────────────────────────────────────────────────────────────

export interface IPermissionVisibility {
  resource: string;
  action: string;
  scope?: "own" | "tenant" | "all";
}

// ──────────────────────────────────────────────────────────────────
// Edit op — one builder edit, the delta on a customized component.
//
// A delta row is a component whose tree is the base component's tree
// with these ops applied on top (deep-merge semantics: the user's op
// wins on exactly the paths it touches; everything else flows from the
// current base). The merge runs at read time (service layer) — no
// materialized fork rows. Deltas are always tenant-scoped (tenantId
// set) and always target a BASE component (baseComponentId set); a
// delta never targets another delta.
//
// A delta may be further scoped to an EXTERNAL resource via
// `externalId` (optional) — an opaque id owned by the app (e.g. a
// menu's CUID, a page's slug). One row per (base, tenant, externalId);
// NULL externalId = the tenant-wide delta. Resolution passes the
// external id through the render request (e.g. ?externalId=).
// ──────────────────────────────────────────────────────────────────

export type TEditOperation =
  | "merge"
  | "replace"
  | "append"
  | "prepend"
  | "remove"
  | "insert";

export interface IEditOp {
  /** Stable op id (undo/redo targeting). */
  id: string;
	  /** Which part of the component tree this op targets. */
	  selector:
	    | { kind: "config"; path: string } // dot-path into config
	    | { kind: "identity"; path: string } // component column: displayName/description/icon/…
	    | { kind: "slot"; slotName: string } // a whole slot (children list)
	    | { kind: "element"; elementId: number }; // a specific child element
  operation: TEditOperation;
  value?: unknown;
  /** For append/insert: the created node, carrying its own id. */
  node?: {
    /** Explicit id for the created element — stable across re-merges. */
    id: number;
    [key: string]: unknown;
  };
  /** For array ops: match existing children by id instead of position. */
  matchBy?: "id" | "type";
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
//
// Customization is a delta row: baseComponentId + editOps (tenant-scoped).
// The merged tree is computed at read time; base rows have no editOps.

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

	  // ── Delta target (component-level customization) ───────────────
	  // When set, this component is a tenant-scoped delta of another
	  // component: its tree is the base's tree with `editOps` applied on
	  // top at read time (no materialized fork rows). Deltas always
	  // reference a BASE component (a row with editOps = null) and always
	  // carry a tenantId.
	  baseComponentId: integer("base_component_id").references(
	  	(): any => archComponents.id,
	  ),

	  // The delta — the builder's edit history (selector + op + value).
	  // Null for base components.
	  editOps: json("edit_ops").$type<IEditOp[]>(),

	  // Optional external-resource scope for the delta (e.g. a menu's
	  // CUID). NULL = the tenant-wide customization. Polymorphic — no FK.
	  externalId: varchar("external_id", { length: 100 }),

  // ── Status ───────────────────────────────────────────────────
  displayOrder: integer("display_order").default(0).notNull(),
  tenantId: varchar("tenant_id", { length: 24 }),
  isActive: boolean("is_active").default(true).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),

	  // ── Metadata ─────────────────────────────────────────────────
	  meta: json("meta").$type<Record<string, unknown> | null>(),
	},
	(table) => [
		// One tenant-wide delta per (base, tenant) — externalId NULL.
		// Base rows (baseComponentId NULL) are exempt: Postgres unique
		// indexes treat NULLs as distinct.
		uniqueIndex("arch_components_base_tenant_uniq").on(
			table.baseComponentId,
			table.tenantId,
		).where(isNull(table.externalId)),
		// One external-scoped delta per (base, tenant, externalId).
		uniqueIndex("arch_components_base_tenant_external_uniq").on(
			table.baseComponentId,
			table.tenantId,
			table.externalId,
		).where(sql`${table.externalId} is not null`),
	],
);

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
	    // Delta target (self-referencing)
	    baseComponent: one(archComponents, {
	      fields: [archComponents.baseComponentId],
	      references: [archComponents.id],
	      relationName: "baseComponent",
	    }),
	    // Elements belonging to this component
	    elements: many(archComponentElements),
	  }),
	);
