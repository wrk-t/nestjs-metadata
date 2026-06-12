import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { FormSectionsService } from "../../services/form-sections.service";

@ApiTags("Form Sections")
@Controller("form-sections")
export class FormSectionsController extends BaseEntityController<FormSectionsService> {
  constructor(svc: FormSectionsService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }
}
