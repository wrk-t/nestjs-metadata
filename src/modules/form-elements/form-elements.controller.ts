import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { FormElementsService } from "../../services/form-elements.service";

@ApiTags("Form Elements")
@Controller("form-elements")
export class FormElementsController extends BaseEntityController<FormElementsService> {
  constructor(svc: FormElementsService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }
}
