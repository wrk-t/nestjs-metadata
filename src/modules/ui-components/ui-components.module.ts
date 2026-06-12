import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { UiComponentsController } from "./ui-components.controller";

@Module({
  imports: [ClsModule],
  controllers: [UiComponentsController],
})
export class UiComponentsModule {}
