import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { WidgetContractsController } from "./widget-contracts.controller";

@Module({
  imports: [ClsModule],
  controllers: [WidgetContractsController],
})
export class WidgetContractsModule {}
