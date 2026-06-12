import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { ModulesService } from "../../services/modules.service";

@ApiTags("Modules")
@Controller("modules")
export class ModulesController extends BaseEntityController<ModulesService> {
  constructor(svc: ModulesService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }
}
