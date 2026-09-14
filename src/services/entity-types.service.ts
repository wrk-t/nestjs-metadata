import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { RequestContext, ITranslationService } from "@wrk-t/nestjs-core";
import { MetadataBaseService } from "../common/metadata-base-service";
import { TRANSLATION_SERVICE } from "../metadata.types";
import { entityTypes } from "../schemas";
import { EntityTypesPgRepository } from "../repositories/entity-types.pg.repository";

@Injectable()
export class EntityTypesService extends MetadataBaseService<
	typeof entityTypes,
	EntityTypesPgRepository,
	number
> {
	logger = new Logger(EntityTypesService.name);

	constructor(
		repo: EntityTypesPgRepository,
		@Optional()
		@Inject(TRANSLATION_SERVICE)
		readonly translationService?: ITranslationService,
		@Optional() requestContext?: RequestContext,
	) {
		super(repo, requestContext, translationService);
	}

	protected override guardCreate(_data: any): undefined {}
	protected override guardUpdate(
		_id: number,
		_existing: any,
		_data: any,
	): undefined {}
	protected override guardDelete(_id: number, _existing: any): undefined {}
	protected override guardRecover(_id: number, _existing: any): undefined {}

	/** The current (highest-version) active type for a key. */
	async findCurrentByKey(key: string) {
		return await this.repo.findCurrentByKey(key);
	}
}
