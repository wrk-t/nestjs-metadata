import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { TablesController } from "./tables.controller";

@Module({
  imports: [ClsModule],
  controllers: [TablesController],
})
export class TablesModule {}
