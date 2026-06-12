import { Controller, Get, Param, Query, Req, Headers, Version } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OkDto } from "@esmaeel_emadi/ts-exc";
import { FormsService } from "../../services/forms.service";
import { SimpleEntityDto } from "../../common/simple-dto";

@ApiTags("Forms")
@Controller("forms")
export class FormsController {
  constructor(private readonly svc: FormsService) {}

  @Get(":id")
  @Version("1")
  @ApiHeader({ name: "x-lang", required: false })
  @ApiOperation({ summary: "Get form by ID with render data", operationId: "get_form_by_id_v1" })
  async findById(
    @Param("id") id: string,
    @Query("include") include?: string,
    @Query("context") context?: "create" | "edit" | "view",
    @Headers("x-lang") lang?: string,
  ) {
    if (include) {
      const result = await this.svc.getFormRender(id, {
        context: context ?? "create",
        locale: lang ?? "en",
      });
      return new OkDto(result);
    }
    const record = await this.svc.selectOneById(id);
    return new OkDto(new SimpleEntityDto(record as any));
  }

  @Get()
  @Version("1")
  @ApiOperation({ summary: "List forms", operationId: "get_forms_list_v1" })
  async findMany(@Query() query: any) {
    const r = await this.svc.findMany(query);
    return new OkDto(r);
  }
}
