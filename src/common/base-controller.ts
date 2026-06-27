import { Body, Delete, Get, Param, Patch, Post, Query, Version } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { Transactional } from "@nestjs-cls/transactional";
import { CreatedDto, OkDto } from "@wrk-t/ts-exc";
import { ScopedBaseService } from "@wrk-t/nestjs-core";

/**
 * Base CRUD controller for metadata entities.
 * Extend this and provide the service + DTOs.
 */
export class BaseEntityController<Service extends ScopedBaseService<any, any>> {
  constructor(
    protected readonly svc: Service,
    private readonly dtoClass: new (data: any) => any,
    private readonly paginatedDtoClass?: new (data: any) => any,
  ) {}

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
    const r = await this.svc.selectOneById(id);
    return new OkDto(new this.dtoClass(r));
  }

  @Get()
  @Version("1")
  @ApiOperation({ summary: "List" })
  async findMany(@Query() query: any) {
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
    const r = await this.svc.updateOneById(id, data);
    return new OkDto(new this.dtoClass(r));
  }

  @Delete(":id")
  @Version("1")
  @ApiOperation({ summary: "Soft delete" })
  @Transactional("MAIN_DB")
  async delete(@Param("id") id: string) {
    const r = await this.svc.softDeleteOneById(id);
    return new OkDto(new this.dtoClass(r));
  }

  @Patch(":id/soft-delete")
  @Version("1")
  @ApiOperation({ summary: "Soft delete" })
  @Transactional("MAIN_DB")
  async softDelete(@Param("id") id: string) {
    const r = await this.svc.softDeleteOneById(id);
    return new OkDto(new this.dtoClass(r));
  }

  @Patch(":id/recover")
  @Version("1")
  @ApiOperation({ summary: "Recover" })
  @Transactional("MAIN_DB")
  async recover(@Param("id") id: string) {
    const r = await this.svc.recoverOneById(id);
    return new OkDto(new this.dtoClass(r));
  }
}
