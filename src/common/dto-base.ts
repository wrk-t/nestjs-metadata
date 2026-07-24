import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

// ── Shared DTO bases (replaces project-specific ~config/database/main/dtos) ──

export class PublicTableDto {
	@ApiProperty({ example: "cuid24characters00000000", type: String })
	@IsString()
	readonly id!: string;

	@ApiProperty()
	@IsDate()
	@Type(() => Date)
	readonly createdAt!: Date;

	@ApiProperty({ required: false, nullable: true })
	@IsDate()
	@Type(() => Date)
	@IsOptional()
	readonly deletedAt: Date | null = null;

	@ApiProperty()
	@IsDate()
	@Type(() => Date)
	readonly updatedAt!: Date;
}

export class BasePagableQueryDto {
	@ApiProperty({ required: false, default: 1 })
	@IsInt()
	@Min(1)
	@Type(() => Number)
	@IsOptional()
	page?: number;

	@ApiProperty({ required: false, default: 25 })
	@IsInt()
	@Min(1)
	@Type(() => Number)
	@IsOptional()
	limit?: number;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	search?: string;

	@ApiProperty({ required: false, enum: ["asc", "desc"], default: "desc" })
	@IsEnum({ asc: "asc", desc: "desc" })
	@IsOptional()
	sortOrder?: "asc" | "desc" = "desc";
}

export class PaginatedDto<T> {
	@ApiProperty()
	data: T[];

	@ApiProperty()
	total: number;

	@ApiProperty()
	page: number;

	@ApiProperty({ nullable: true })
	limit: number | null;

	@ApiProperty({ nullable: true })
	totalPages: number | null;

	constructor(result: {
		data: T[];
		total: number | null;
		page: number;
		limit: number | null;
		totalPages: number | null;
	}) {
		this.data = result.data;
		this.total = result.total ?? 0;
		this.page = result.page;
		this.limit = result.limit;
		this.totalPages = result.totalPages;
	}
}
