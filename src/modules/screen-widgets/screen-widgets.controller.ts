import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { ScreenWidgetsService } from "../../services/screen-widgets.service";

@ApiTags("Screen Widgets")
@Controller("screen-widgets")
export class ScreenWidgetsController extends BaseEntityController<ScreenWidgetsService> {
  constructor(svc: ScreenWidgetsService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }
}
