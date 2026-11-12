import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DbModule } from './db/db.module'
import { ForecastModule } from './forecast/forecast.module'
import { HistoryModule } from './history/history.module'
import { UploadModule } from './upload/upload.module'
import { WorkbookModule } from './workbook/workbook.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
    }),
    DbModule,
    UploadModule,
    ForecastModule,
    HistoryModule,
    WorkbookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
