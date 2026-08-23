import { Controller, Get, Param, ParseIntPipe, Query, Version } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OkDto } from "@wrk-t/ts-exc";
import { ScreensService } from "../../services/screens.service";

@ApiTags("Screens")
@Controller("screens")
export class ScreensController {
  constructor(private readonly svc: ScreensService) {}

   	@Get(":id/render")
   	@Version("1")
   	@ApiOperation({ summary: "Get screen render data", operationId: "get_screen_render_v1" })
   	async render(@Param("id", ParseIntPipe) id: number) {
   		const result = await this.svc.render(id);
   		return new OkDto(result);
   	}

	  @Get(":id/components")
	  @Version("1")
	  @ApiOperation({
	  	summary: "List components used by a screen",
	  	operationId: "get_screen_components_v1",
	  })
	  async findComponents(@Param("id", ParseIntPipe) id: number) {
	  	const result = await this.svc.findScreenComponents(id);
	  	return new OkDto(result);
	  }

	  @Get(":id/tree")
	  @Version("1")
	  @ApiOperation({
	  	summary: "Get nested component tree of a screen",
	  	operationId: "get_screen_tree_v1",
	  })
	  async findTree(@Param("id", ParseIntPipe) id: number) {
	  	const result = await this.svc.findScreenTree(id);
	  	return new OkDto(result);
	  }

  @Get(":id")
  @Version("1")
  @ApiOperation({ summary: "Get screen by ID", operationId: "get_screen_by_id_v1" })
	  async findById(@Param("id", ParseIntPipe) id: number) {
	    const record = await this.svc.selectOneById(id);
	    return new OkDto(record);
	  }

  @Get()
  @Version("1")
  @ApiOperation({ summary: "List screens", operationId: "get_screens_list_v1" })
  async findMany(@Query() query: any) {
    const r = await this.svc.findMany(query);
    return new OkDto(r);
  }
}
