import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { TableColumnInstancesController } from "./table-column-instances.controller";

@Module({
  imports: [ClsModule],
  controllers: [TableColumnInstancesController],
})
export class TableColumnInstancesModule {}
