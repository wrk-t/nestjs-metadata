import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { EntityTypesController } from "./entity-types.controller";

@Module({
	imports: [ClsModule],
	controllers: [EntityTypesController],
})
export class EntityTypesModule {}
