import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { FieldDefinitionsService } from "../../services/field-definitions.service";

@ApiTags("Field Definitions")
@Controller("field-definitions")
export class FieldDefinitionsController extends BaseEntityController<FieldDefinitionsService> {
  constructor(svc: FieldDefinitionsService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }
}
