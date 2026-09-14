import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { EntityTypesService } from "../../services/entity-types.service";

@ApiTags("EntityTypes")
@Controller("entity-types")
export class EntityTypesController extends BaseEntityController<
	EntityTypesService,
	number
> {
	constructor(svc: EntityTypesService) {
		super(svc, SimpleEntityDto, SimplePaginatedDto);
	}
}
