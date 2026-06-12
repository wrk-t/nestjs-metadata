import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { EntitiesController } from "./entities.controller";

@Module({
  imports: [ClsModule],
  controllers: [EntitiesController],
})
export class EntitiesModule {}
