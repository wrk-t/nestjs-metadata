import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { ScreenWidgetsController } from "./screen-widgets.controller";

@Module({
  imports: [ClsModule],
  controllers: [ScreenWidgetsController],
})
export class ScreenWidgetsModule {}
