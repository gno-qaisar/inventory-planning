import { Module } from '@nestjs/common'
import { WorkbookService } from './workbook.service'

@Module({
  providers: [WorkbookService],
  exports: [WorkbookService],
})
export class WorkbookModule {}

