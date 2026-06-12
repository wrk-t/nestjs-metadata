import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { FieldDefinitionsController } from "./field-definitions.controller";

@Module({
  imports: [ClsModule],
  controllers: [FieldDefinitionsController],
})
export class FieldDefinitionsModule {}
