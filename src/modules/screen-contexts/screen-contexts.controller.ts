import { Controller, Get, Param, Version } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OkDto } from "@wrk-t/ts-exc";
import { BaseEntityController } from "../../common/base-controller";
import { SimpleEntityDto, SimplePaginatedDto } from "../../common/simple-dto";
import { ScreenContextsService } from "../../services/screen-contexts.service";

@ApiTags("Screen Contexts")
@Controller("screen-contexts")
export class ScreenContextsController extends BaseEntityController<ScreenContextsService> {
  constructor(svc: ScreenContextsService) {
    super(svc, SimpleEntityDto, SimplePaginatedDto);
  }

  @Get("by-screen/:screenId")
  @Version("1")
  @ApiOperation({ summary: "Get screen context by screen ID" })
  async findByScreenId(@Param("screenId") screenId: string) {
    const result = await this.svc.findByScreenId(screenId);
    return new OkDto(result);
  }
}
