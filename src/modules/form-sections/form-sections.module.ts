import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { FormSectionsController } from "./form-sections.controller";

@Module({
  imports: [ClsModule],
  controllers: [FormSectionsController],
})
export class FormSectionsModule {}
