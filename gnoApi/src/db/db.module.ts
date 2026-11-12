import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HistoryLog } from './entities/history.entity'
import { Override } from './entities/override.entity'
import { RawInventory } from './entities/raw-inventory.entity'
import { RawSale } from './entities/raw-sales.entity'
import { Session } from './entities/session.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url:
          config.get<string>('DATABASE_URL') ??
          'postgresql://postgres:postgres@localhost:5432/gno_forecast',
        entities: [Session, RawSale, RawInventory, Override, HistoryLog],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DbModule {}
