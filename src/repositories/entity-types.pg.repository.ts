import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
	InjectTransactionHost,
	TransactionHost,
} from "@nestjs-cls/transactional";
import { and, desc, eq, isNull, SQL } from "drizzle-orm";
import { ClsService } from "nestjs-cls";
import { Repository, ILogService } from "@wrk-t/nestjs-core";
import { entityTypes } from "../schemas";

@Injectable()
export class EntityTypesPgRepository extends Repository<
	any,
	typeof entityTypes,
	number
> {
	protected override tableName = "entityTypes";

	override applyScope(condition: SQL | undefined): SQL | undefined {
		return condition;
	}

	protected override filterableFields: Record<string, (value: any) => SQL> = {
		key: (value: string) => eq(entityTypes.key, value),
		isActive: (value: boolean) => eq(entityTypes.isActive, value),
		isSystem: (value: boolean) => eq(entityTypes.isSystem, value),
		tenantId: (value: string) => eq(entityTypes.tenantId, value),
	};
	protected override searchableColumns: any = ["name", "displayName", "key"];
	protected override defaultSortColumn: any = "createdAt";
	protected override includeMap = {};

	constructor(
		@Optional() readonly eventEmitter: EventEmitter2,
		@InjectTransactionHost("MAIN_DB") readonly txHost: TransactionHost,
		@Optional() protected readonly logService?: ILogService,
		@Optional() protected readonly cls?: ClsService,
	) {
		super(entityTypes, txHost, eventEmitter, logService, cls);
	}

	/**
	 * The CURRENT (highest-version) active type for a key — what a
	 * template references when authoring new data.
	 */
	async findCurrentByKey(key: string): Promise<typeof entityTypes.$inferSelect | null> {
		return await this.execute(async (db) => {
			const rows = await db
				.select()
				.from(entityTypes)
				.where(
					and(
						eq(entityTypes.key, key),
						eq(entityTypes.isActive, true),
						isNull(entityTypes.deletedAt),
					),
				)
				.orderBy(desc(entityTypes.version))
				.limit(1);
			return rows[0] ?? null;
		}, "read");
	}
}
