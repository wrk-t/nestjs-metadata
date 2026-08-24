// ──────────────────────────────────────────────────────────────────
// CapabilityService — tier + feature-flag gating for modules/screens.
//
// The metadata package can't depend on the host app's tier/feature
// services, but it shares the host's database (METADATA_DB → MAIN_DB),
// which holds every table. Feature resolution mirrors the old seed
// model exactly:
//
//   features      — the catalog (feature name → id)
//   tier_feature  — the tier's default (enabled, overridable);
//                   a feature with NO row for a tier is not part of
//                   that tier's offering (tenant overrides cannot grant it)
//   tenant_feature— per-tenant override, wins when the tier allows it
//
// Tiers come from tenants.tier_id → tiers.name ("solo" < "team" <
// "enterprise"). Super admins bypass gating; users without a tenant
// context count as "solo" with everything feature-gated OFF.
// ──────────────────────────────────────────────────────────────────
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { RequestContext } from "@wrk-t/nestjs-core";
import {
  InjectTransactionHost,
  TransactionHost,
} from "@nestjs-cls/transactional";

export type TTier = "solo" | "team" | "enterprise";

const TIER_LEVEL: Record<TTier, number> = { solo: 0, team: 1, enterprise: 2 };

/** Row shape of a gated module/screen (the fields CapabilityService reads). */
export interface ICapabilityTarget {
	requiredTier?: string | null;
	requiresFeature?: string | null;
}

/**
 * Minimal view of the drizzle instance CapabilityService needs.
 *
 * Raw `execute` on the pg driver resolves to the pg `QueryResult`
 * (an object with a `rows` array) — NOT a bare row array. All call
 * sites read `.rows` accordingly.
 */
type CapabilityDb = {
	execute<T = unknown>(query: unknown): Promise<{ rows: T }>;
};

@Injectable()
export class CapabilityService {
	constructor(
		@InjectTransactionHost("MAIN_DB") private readonly txHost: TransactionHost,
		@Optional() private readonly requestContext?: RequestContext,
	) {}

	private get db(): CapabilityDb {
		return this.txHost.tx as CapabilityDb;
	}

	/** Super admins see everything — they manage the platform. */
	private get isSuperAdmin(): boolean {
		return this.requestContext?.getIsSuperAdmin() ?? false;
	}

	/** True when the current tier satisfies the requirement. */
	canAccessTier(required: string | null | undefined, current: TTier): boolean {
		if (!required) return true;
		const req = TIER_LEVEL[required as TTier];
		if (req === undefined) return true; // unknown requirement → allow
		return TIER_LEVEL[current] >= req;
	}

	/** Resolve the current tenant's tier name (no tenant → "solo"). */
	async resolveTier(): Promise<TTier> {
		const tenantId = this.requestContext?.getTenantId();
		if (!tenantId) return "solo";
		const { rows } = await this.db.execute<{ name: string }[]>(sql`
			SELECT t2.name
			FROM tenants t1
			JOIN tiers t2 ON t2.id = t1.tier_id
			WHERE t1.id = ${tenantId}
			LIMIT 1
		`);
		return (rows?.[0]?.name as TTier) ?? "solo";
	}

	/**
	 * Whether a feature flag is enabled for the current tenant, following
	 * the tier-ceiling + override resolution (see file header).
	 */
	async isFeatureEnabled(featureName: string): Promise<boolean> {
		if (this.isSuperAdmin) return true;
		const tenantId = this.requestContext?.getTenantId();
		if (!tenantId) return false;

		const { rows: featRows } = await this.db.execute<{ id: number }[]>(sql`
			SELECT id FROM features WHERE name = ${featureName} LIMIT 1
		`);
		const feat = featRows?.[0];
		if (!feat?.id) return false;

		const { rows: tierRows } = await this.db.execute<
			{ enabled: boolean; overridable: boolean }[]
		>(sql`
			SELECT tf.enabled, tf.overridable
			FROM tier_feature tf
			JOIN tenants t ON t.tier_id = tf.tier_id
			WHERE t.id = ${tenantId} AND tf.feature_id = ${feat.id}
			LIMIT 1
		`);
		const tierRow = tierRows?.[0];
		if (!tierRow) return false; // not part of the tier's offering

		if (tierRow.overridable) {
			const { rows: overrideRows } = await this.db.execute<{ enabled: boolean }[]>(sql`
				SELECT enabled FROM tenant_feature
				WHERE tenant_id = ${tenantId} AND feature_id = ${feat.id}
				LIMIT 1
			`);
			const override = overrideRows?.[0];
			if (override) return override.enabled === true;
		}

		return tierRow.enabled === true;
	}

	/**
	 * Gate a module/screen row: both tier and feature must pass.
	 * Super admins bypass. No requirements → always visible.
	 */
	async canAccess(target: ICapabilityTarget): Promise<boolean> {
		if (this.isSuperAdmin) return true;
		if (!target.requiredTier && !target.requiresFeature) return true;

		if (target.requiresFeature && !(await this.isFeatureEnabled(target.requiresFeature))) {
			return false;
		}
		if (target.requiredTier && !this.canAccessTier(target.requiredTier, await this.resolveTier())) {
			return false;
		}
		return true;
	}
}
