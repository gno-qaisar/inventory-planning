import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HistoryLog } from '../db/entities/history.entity'
import { HistoryController } from './history.controller'
import { HistoryService } from './history.service'

@Module({
  imports: [TypeOrmModule.forFeature([HistoryLog])],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}

