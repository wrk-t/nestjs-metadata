import { Body, Delete, Get, Param, Patch, Post, Query, Version, Headers } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { Transactional } from "@nestjs-cls/transactional";
import { CreatedDto, OkDto } from "@wrk-t/ts-exc";
import { ScopedBaseService } from "@wrk-t/nestjs-core";

/**
 * Base CRUD controller for metadata entities.
 * Extend this and provide the service + DTOs.
 */
export class BaseEntityController<
  Service extends ScopedBaseService<any, any, TId>,
  TId = string,
> {
  constructor(
    protected readonly svc: Service,
    private readonly dtoClass: new (data: any) => any,
    private readonly paginatedDtoClass?: new (data: any) => any,
  ) {}

  /** Route params arrive as strings — metadata services with numeric ids coerce via PG. */
  protected toId(id: string): TId {
    return id as unknown as TId;
  }

  @Post()
  @Version("1")
  @ApiOperation({ summary: "Create" })
  @Transactional("MAIN_DB")
  async create(@Body() data: any) {
    const r = await this.svc.createOne(data);
    return new CreatedDto(new this.dtoClass(r));
  }

  	@Get(":id")
  	@Version("1")
  	@ApiOperation({ summary: "Get by ID" })
  	async findById(@Param("id") id: string) {
  		const r = await this.svc.selectOneById(this.toId(id));
  		return new OkDto(new this.dtoClass(r));
  	}

  @Get()
  @Version("1")
  @ApiOperation({ summary: "List" })
  async findMany(@Query() query: any, @Headers("accept-language") lang?: string) {
    if (lang) query._locale = lang.split(",")[0]?.trim();
    const r = await this.svc.findMany(query);
    if (this.paginatedDtoClass) {
      return new OkDto(new this.paginatedDtoClass(r));
    }
    return new OkDto(r);
  }

  @Patch(":id")
  @Version("1")
  @ApiOperation({ summary: "Update" })
  @Transactional("MAIN_DB")
  	async update(@Body() data: any, @Param("id") id: string) {
  		const r = await this.svc.updateOneById(this.toId(id), data);
  		return new OkDto(new this.dtoClass(r));
  	}

  @Delete(":id")
  @Version("1")
  @ApiOperation({ summary: "Soft delete" })
  @Transactional("MAIN_DB")
  	async delete(@Param("id") id: string) {
  		const r = await this.svc.softDeleteOneById(this.toId(id));
  		return new OkDto(new this.dtoClass(r));
  	}

  @Patch(":id/soft-delete")
  @Version("1")
  @ApiOperation({ summary: "Soft delete" })
  @Transactional("MAIN_DB")
  	async softDelete(@Param("id") id: string) {
  		const r = await this.svc.softDeleteOneById(this.toId(id));
  		return new OkDto(new this.dtoClass(r));
  	}

  @Patch(":id/recover")
  @Version("1")
  @ApiOperation({ summary: "Recover" })
  @Transactional("MAIN_DB")
  	async recover(@Param("id") id: string) {
  		const r = await this.svc.recoverOneById(this.toId(id));
  		return new OkDto(new this.dtoClass(r));
  	}
}
