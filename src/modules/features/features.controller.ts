import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { FeaturesService } from "../../services/features.service";

@ApiTags("Features")
@Controller("features")
export class FeaturesController extends BaseEntityController<FeaturesService> {
  constructor(svc: FeaturesService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }
}
