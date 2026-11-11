import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Override } from '../db/entities/override.entity'
import { RawInventory } from '../db/entities/raw-inventory.entity'
import { RawSale } from '../db/entities/raw-sales.entity'
import { Session } from '../db/entities/session.entity'
import { HistoryModule } from '../history/history.module'
import { ForecastController } from './forecast.controller'
import { ForecastService } from './forecast.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, RawSale, RawInventory, Override]),
    HistoryModule,
  ],
  controllers: [ForecastController],
  providers: [ForecastService],
  exports: [ForecastService],
})
export class ForecastModule {}

