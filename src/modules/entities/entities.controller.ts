import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { EntitiesService } from "../../services/entities.service";

@ApiTags("Entities")
@Controller("entities")
export class EntitiesController extends BaseEntityController<EntitiesService> {
  constructor(svc: EntitiesService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }
}
