import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { ScreenContextsController } from "./screen-contexts.controller";

@Module({
  imports: [ClsModule],
  controllers: [ScreenContextsController],
})
export class ScreenContextsModule {}
