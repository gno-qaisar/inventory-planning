import {
  Body,
  Controller,
  Get,
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

  @Get('history')
  async getHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = limit ? Math.max(1, parseInt(limit, 10)) : 50
    const o = offset ? Math.max(0, parseInt(offset, 10)) : 0
    return this.uploadService.getSessions(l, o)
  }
}

