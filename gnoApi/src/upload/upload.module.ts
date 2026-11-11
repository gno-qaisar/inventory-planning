import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RawInventory } from '../db/entities/raw-inventory.entity'
import { RawSale } from '../db/entities/raw-sales.entity'
import { Session } from '../db/entities/session.entity'
import { HistoryModule } from '../history/history.module'
import { UploadController } from './upload.controller'
import { UploadService } from './upload.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, RawSale, RawInventory]),
    HistoryModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}

