import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { UiComponentsService } from "../../services/ui-components.service";

@ApiTags("UI Components")
@Controller("ui-components")
export class UiComponentsController extends BaseEntityController<UiComponentsService> {
  constructor(svc: UiComponentsService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }
}
