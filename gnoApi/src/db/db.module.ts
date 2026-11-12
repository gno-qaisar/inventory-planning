import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HistoryLog } from './entities/history.entity'
import { Override } from './entities/override.entity'
import { RawInventory } from './entities/raw-inventory.entity'
import { RawSale } from './entities/raw-sales.entity'
import { Session } from './entities/session.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url:
          process.env.DATABASE_URL ??
          'postgresql://postgres:postgres@localhost:5432/gno_forecast',
        entities: [Session, RawSale, RawInventory, Override, HistoryLog],
        synchronize: process.env.NODE_ENV !== 'production',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DbModule {}
