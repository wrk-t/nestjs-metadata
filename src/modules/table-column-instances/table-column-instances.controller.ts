import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { TableColumnInstancesService } from "../../services/table-column-instances.service";

@ApiTags("Table Column Instances")
@Controller("table-column-instances")
export class TableColumnInstancesController extends BaseEntityController<TableColumnInstancesService> {
  constructor(svc: TableColumnInstancesService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }
}
