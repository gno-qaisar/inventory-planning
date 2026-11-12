import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)

  app.enableCors({ origin: ['http://localhost:5173'], credentials: true })
  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )

  app.useGlobalFilters(new GlobalExceptionFilter())
  app.enableShutdownHooks()

  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT', 3000)
  await app.listen(port)
  logger.log(`GNO Inventory Forecasting API listening on port ${port}`)
}
bootstrap()
