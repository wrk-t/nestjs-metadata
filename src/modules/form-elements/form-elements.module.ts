import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { FormElementsController } from "./form-elements.controller";

@Module({
  imports: [ClsModule],
  controllers: [FormElementsController],
})
export class FormElementsModule {}
