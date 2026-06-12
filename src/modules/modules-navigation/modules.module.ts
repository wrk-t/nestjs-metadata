import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { ModulesController } from "./modules.controller";

@Module({
  imports: [ClsModule],
  controllers: [ModulesController],
})
export class ModulesModule {}
