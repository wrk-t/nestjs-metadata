import { ApiProperty } from "@nestjs/swagger";
import { PaginatedDto, PublicTableDto } from "./dto-base";

/**
 * Generic entity DTO — wraps any metadata entity record.
 */
export class SimpleEntityDto extends PublicTableDto {
  [key: string]: any;

  constructor(data: Record<string, any>) {
    super();
    Object.assign(this, data);
  }
}

/**
 * Paginated wrapper for entity lists.
 */
export class SimplePaginatedDto extends PaginatedDto<SimpleEntityDto> {
  constructor(
    data: PaginatedDto<SimpleEntityDto> & { data: Record<string, any>[] },
  ) {
    super({
      data: data.data.map((item: any) => new SimpleEntityDto(item)),
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
    });
  }
}
