import { relations } from "drizzle-orm";
import { boolean, integer, json, pgTable, varchar } from "drizzle-orm/pg-core";
import { ids } from "../../helpers/ids";
import { timestamps } from "../../helpers/timestamps";

// ──────────────────────────────────────────────────────────────────
// Slot declaration — a named container on a blueprint that accepts
// children of specific types.
// ──────────────────────────────────────────────────────────────────

export interface IBlueprintSlot {
  /** Slot name — e.g. "columns", "body", "toolbar" */
  name: string;
  displayName?: string;
  description?: string;
  /** Names of blueprints accepted in this slot (e.g. ["field-renderer", "section"]) */
  accepts: string[];
  /** Kinds accepted in this slot — a kind-constrained slot takes ANY
   *  blueprint of that kind, so same-kind components are interchangeable
   *  (e.g. a shell header slot accepting kind "nav" lets any nav be
   *  swapped in without listing concrete blueprints). */
  acceptsKinds?: string[];
  /** Layout strategy for children */
  grid?: "flow" | "css-grid" | "none";
  /** Paths within elements filling this slot that tenants can override */
  overridable?: string[];
}

// ──────────────────────────────────────────────────────────────────
// Contract — what params a component type needs and provides
// ──────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────
// Config-field declaration — the FULL config surface of a blueprint,
// declared on the blueprint itself (stored in its `meta.configFields`).
// Each property carries a `clientVisible` flag: whether regular
// (tenant) users see and edit it in the client-side editors. System
// clientVisible: false.
// ──────────────────────────────────────────────────────────────────

export interface IBlueprintConfigField {
  /** Dot path relative to the component `config`, e.g. "text" or "datasource.endpoint". */
  path: string;
  type: "string" | "multiLine" | "number" | "boolean" | "select" | "color";
  /** `$trl_` key for the editor label (resolved via TranslationService). */
  labelKey?: string;
  /** Allowed values for `select`/`color` fields. */
  options?: string[];
  defaultValue?: unknown;
  required?: boolean;
  /** Visible + editable for regular users on the client (tenant UI). */
  clientVisible: boolean;
}

// ──────────────────────────────────────────────────────────────────
// arch_component_blueprints
// ──────────────────────────────────────────────────────────────────
//
// Defines *what a component type is* — its slots, its override
// surface, and its parameter contract.  This is the "class".
//
// Examples:
//   name: "table"     → slots: ["columns", "toolbar", "row-actions"]
//   name: "form"      → slots: ["content"]
//   name: "section"   → slots: ["content"],  overridable: ["displayName"]
//   name: "page"      → slots: ["body"],     grid: "css-grid"
//   name: "badge"     → slots: []  (leaf renderer, no children)
//   name: "chart-cell"→ slots: []  (leaf renderer)

export const archComponentBlueprints = pgTable("arch_component_blueprints", {
  ...ids,
  ...timestamps,

  // ── Identity ─────────────────────────────────────────────────
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),

  // ── Slots ────────────────────────────────────────────────────
  // Named containers that accept children of specific blueprint types.
  // e.g. [{ name: "columns", accepts: ["field-renderer", "badge", "chart-cell"], grid: "flow" }]
  slots: json("slots").$type<IBlueprintSlot[]>().notNull(),

  // ── Overridable surface ──────────────────────────────────────
  // Dot-notation paths tenants can override on instances of this blueprint.
  // e.g. ["displayName", "config.settings.density", "config.datasource"]
  overridable: json("overridable").$type<string[]>(),

  // ── Contract ─────────────────────────────────────────────────
  // What params this component type needs (inputs) and provides (outputs).
  contract: json("contract").$type<{
    inputs?: IBlueprintContractParam[];
    outputs?: IBlueprintContractOutput[];
  }>(),

  // ── Status ───────────────────────────────────────────────────
  category: varchar("category", { length: 100 }),
  /** What a blueprint IS — its kind role. Same-kind components can
   *  replace each other in kind-constrained slots (e.g. "nav",
   *  "footer", "menu", "hero", "section", "shell", "page"). */
  kind: varchar("kind", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),

  // ── Metadata ─────────────────────────────────────────────────
  meta: json("meta").$type<Record<string, unknown> | null>(),
});

// ──────────────────────────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────────────────────────

// Lazy import to avoid circular dependency — Drizzle resolves at init time.
import { archComponents } from "./components";

export const archComponentBlueprintsRelations = relations(
  archComponentBlueprints,
  ({ many }) => ({
    instances: many(archComponents, { relationName: "blueprint" }),
  }),
);
