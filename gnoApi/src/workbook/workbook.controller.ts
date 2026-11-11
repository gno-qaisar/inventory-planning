import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { WorkbookService } from './workbook.service'

@Controller('workbook')
export class WorkbookController {
  constructor(private readonly workbookService: WorkbookService) {}

  @Post('verify')
  @UseInterceptors(FileInterceptor('file'))
  async verify(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No xlsx file uploaded')
    }
    return this.workbookService.verifyWorkbook(file.buffer)
  }
}

