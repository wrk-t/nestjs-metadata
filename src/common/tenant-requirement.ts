/**
 * Tenant-membership visibility for modules and screens.
 *
 * The application can be used in two modes:
 * - **inside a tenant** — the user belongs to a tenant
 *   (RequestContext has a tenantId)
 * - **standalone** — the user has no tenant
 *   (RequestContext has no tenantId)
 *
 * The `tenantRequirement` column on `modules` / `screens` controls whether
 * a record is returned to the current user based on which mode they're in:
 * - `"any"`        → always visible (default)
 * - `"tenant"`     → only when the user belongs to a tenant
 * - `"standalone"` → only when the user has no tenant
 */

export type TenantRequirement = "any" | "tenant" | "standalone";

export const DEFAULT_TENANT_REQUIREMENT: TenantRequirement = "any";

/** True when the record satisfies the current user's tenant membership. */
export function satisfiesTenantRequirement(
  requirement: TenantRequirement | null | undefined,
  tenantId: string | undefined,
): boolean {
  if (!requirement || requirement === "any") return true;
  if (requirement === "tenant") return Boolean(tenantId);
  return !tenantId; // "standalone"
}
