import type { IBlueprintSlot } from "../schemas";

// ──────────────────────────────────────────────────────────────────
// Render response types
// ──────────────────────────────────────────────────────────────────

/**
 * Rendered element — the output shape that the frontend receives.
 */
export interface IRenderedElement {
  id: number;
  slotName: string;
  elementType: "field" | "component_ref" | "renderer";

  // For "field" type
  fieldDefinitionId?: number | null;
  uiComponentId?: number | null;
  name?: string | null;
  type?: string | null;
  label?: string | null;
  overrides?: Record<string, unknown> | null;

  // For "component_ref" type
  referencedComponent?: IRenderedComponent | null;
  paramBindings?: Record<string, unknown> | null;

  // For "renderer" type
  rendererBlueprintId?: number | null;
  rendererConfig?: Record<string, unknown> | null;

  // Layout
  grid?: { row?: number; col?: number; rowSpan?: number; colSpan?: number } | null;
  displayOrder: number;

  // Status
  isActive: boolean;
  meta?: Record<string, unknown> | null;
}

/**
 * Rendered component — the resolved output of a component instance.
 */
export interface IRenderedComponent {
  id: number;
  blueprintId: number;
  blueprintName: string;
  /** What the blueprint IS — same-kind components are interchangeable
   *  in kind-constrained slots ("nav", "footer", "menu", "hero",
   *  "section", "shell", "page", …). Null when the catalog doesn't
   *  declare one. */
  kind?: string | null;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  config: Record<string, unknown> | null;
  pathPattern: string | null;

  // Blueprint metadata (for the frontend to know what to expect)
  slots: IBlueprintSlot[];
  overridable: string[] | null;
  contract: Record<string, unknown> | null;

  // Children, grouped by slot
  slotsFilled: Record<string, IRenderedElement[]>;

  // Permission-based visibility
  visibleToPermissions?: Array<{
    resource: string;
    action: string;
    scope?: "own" | "tenant" | "all";
  }> | null;

  // Status
  tenantId: string | null;
  isActive: boolean;
  isSystem: boolean;
  meta: Record<string, unknown> | null;

  // Blueprint-level declarations (e.g. meta.configFields with the
  // per-property clientVisible flag) — editors render from metadata.
  blueprintMeta?: Record<string, unknown> | null;
}

/**
 * Top-level render response for a component.
 */
export interface IComponentRenderResponse {
  component: IRenderedComponent;
}
