import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { FormsController } from "./forms.controller";

@Module({
  imports: [ClsModule],
  controllers: [FormsController],
})
export class FormsModule {}
