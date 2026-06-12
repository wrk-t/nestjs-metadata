import { Controller, Get, Param, Query, Version } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OkDto } from "@esmaeel_emadi/ts-exc";
import { TablesService } from "../../services/tables.service";
import { SimpleEntityDto } from "../../common/simple-dto";

@ApiTags("Tables")
@Controller("tables")
export class TablesController {
  constructor(private readonly svc: TablesService) {}

  @Get(":id/render")
  @Version("1")
  @ApiOperation({ summary: "Get table render data", operationId: "get_table_render_v1" })
  async render(
    @Param("id") id: string,
    @Query("locale") locale?: string,
  ) {
    const result = await this.svc.getTableRender(id, { locale: locale ?? "en" });
    return new OkDto(result);
  }

  @Get(":id")
  @Version("1")
  @ApiOperation({ summary: "Get table by ID", operationId: "get_table_by_id_v1" })
  async findById(
    @Param("id") id: string,
  ) {
    const record = await this.svc.selectOneById(id);
    return new OkDto(new SimpleEntityDto(record as any));
  }

  @Get()
  @Version("1")
  @ApiOperation({ summary: "List tables", operationId: "get_tables_list_v1" })
  async findMany(@Query() query: any) {
    const r = await this.svc.findMany(query);
    return new OkDto(r);
  }
}
