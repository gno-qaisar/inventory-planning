import {
  Body,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { UploadService } from './upload.service'

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('csv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('sessionId') sessionId?: string,
    @Query('sessionId') querySessionId?: string,
  ) {
    return this.uploadService.handleCsvUpload(file, sessionId || querySessionId)
  }

  @Post('xlsx')
  @UseInterceptors(FileInterceptor('file'))
  async uploadXlsx(
    @UploadedFile() file: Express.Multer.File,
    @Body('sessionId') sessionId?: string,
    @Query('sessionId') querySessionId?: string,
  ) {
    return this.uploadService.handleXlsxUpload(file, sessionId || querySessionId)
  }
}

