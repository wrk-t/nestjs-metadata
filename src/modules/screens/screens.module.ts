import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { ScreensController } from "./screens.controller";

@Module({
  imports: [ClsModule],
  controllers: [ScreensController],
})
export class ScreensModule {}
