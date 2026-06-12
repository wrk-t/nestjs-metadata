import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  BasePagableQueryDto,
  PaginatedDto,
  PublicTableDto,
} from "../../common/dto-base";
import { entities } from "../../schemas/entities";

// ── Base types ──────────────────────────────────────────────
export type SelectModel = InferSelectModel<typeof entities>;
export type InsertModel = InferInsertModel<typeof entities>;
export type TPublic = PublicTableDto & SelectModel;
export type TUpdate = Partial<
  Pick<
    InsertModel,
    "name" | "tableName" | "description" | "displayName" | "isSystem" | "isActive" | "meta"
  >
>;
export type TSearchableColumns = Array<keyof Pick<SelectModel, "name" | "displayName" | "tableName">>;

const SORT_BY_ITEMS = [
  "name", "displayName", "tableName", "isSystem", "isActive",
  "createdAt", "updatedAt", "deletedAt",
] as const satisfies ReadonlyArray<keyof SelectModel>;

export const SEARCH_FIELDS = ["name", "displayName", "tableName"];

export type TSortableItems = (typeof SORT_BY_ITEMS)[number];

// ── Entity DTO ──────────────────────────────────────────────
export class BaseEntityDto extends PublicTableDto implements TPublic {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  readonly name!: string;
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  readonly tableName!: string;
  @IsOptional()
  @IsString()
  readonly description: string | null = null;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly displayName: string | null = null;
  @IsOptional()
  @IsString()
  readonly tenantId: string | null = null;
  @IsBoolean()
  readonly isSystem!: boolean;
  @IsBoolean()
  readonly isActive!: boolean;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  meta: Record<string, unknown> | null = null;
}

export class EntityDto extends BaseEntityDto {
  constructor(data: EntityDto) {
    super();
    Object.assign(this, data);
  }
}

// ── Create / Update DTOs ────────────────────────────────────
export class CreateEntityDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  tableName!: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

export class UpdateEntityDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tableName?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

// ── Query DTOs ──────────────────────────────────────────────
export class GetEntitiesQueryDto extends BasePagableQueryDto {
  @IsOptional()
  searchFields?: string[];
  @IsOptional()
  include?: string[];
  @IsOptional()
  @IsString()
  sortBy?: (typeof SORT_BY_ITEMS)[number];
  @IsOptional()
  isSystem?: boolean;
  @IsOptional()
  isActive?: boolean;
}

export class PaginatedEntitiesDto extends PaginatedDto<EntityDto> {
  @ApiProperty({ type: [EntityDto] })
  declare data: EntityDto[];

  constructor(result: { data: EntityDto[]; total: number | null; page: number; limit: number | null; totalPages: number | null }) {
    super(result);
    this.data = result.data.map((item) => new EntityDto(item));
  }
}
