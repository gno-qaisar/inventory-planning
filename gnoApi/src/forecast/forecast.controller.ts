import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import type { ComputedSkuRow } from '@gno/shared'
import { CreateSessionDto } from './dto/create-session.dto'
import { PatchOverrideDto } from './dto/patch-override.dto'
import { ForecastService } from './forecast.service'

@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Post('session')
  async createSession(
    @Body() body: CreateSessionDto,
  ): Promise<{ sessionId: string; rows: ComputedSkuRow[] }> {
    return this.forecastService.createSession(
      body.salesSessionId,
      body.inventorySessionId,
    )
  }

  @Get(':id')
  async getSession(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ rows: ComputedSkuRow[] }> {
    const rows = await this.forecastService.compute(id)
    return { rows }
  }

  @Patch(':id/overrides')
  async patchOverrides(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: PatchOverrideDto,
  ): Promise<{ rows: ComputedSkuRow[]; recalculatedAt: string }> {
    await this.forecastService.applyOverride(id, body.sku, body.patch)
    const rows = await this.forecastService.compute(id)
    return { rows, recalculatedAt: new Date().toISOString() }
  }

  @Post(':id/recalculate')
  async recalculate(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ rows: ComputedSkuRow[]; recalculatedAt: string }> {
    const rows = await this.forecastService.compute(id)
    return {
      rows,
      recalculatedAt: new Date().toISOString(),
    }
  }
}
