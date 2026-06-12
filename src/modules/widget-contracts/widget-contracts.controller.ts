import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { WidgetContractsService } from "../../services/widget-contracts.service";

@ApiTags("Widget Contracts")
@Controller("widget-contracts")
export class WidgetContractsController extends BaseEntityController<WidgetContractsService> {
  constructor(svc: WidgetContractsService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }
}
