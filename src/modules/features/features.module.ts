import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { FeaturesController } from "./features.controller";

@Module({
  imports: [ClsModule],
  controllers: [FeaturesController],
})
export class FeaturesModule {}
