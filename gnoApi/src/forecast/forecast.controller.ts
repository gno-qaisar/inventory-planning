import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'
import type { AnnualTab, ManualOverrides } from '@gno/shared'
import { ForecastService } from './forecast.service'

@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Post('session')
  async createSession(
    @Body() body: { salesSessionId: string; inventorySessionId: string },
  ) {
    const sessionId = body.inventorySessionId || body.salesSessionId
    const rows = await this.forecastService.compute(
      body.inventorySessionId,
      body.salesSessionId,
    )
    return {
      sessionId,
      rows,
    }
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    const rows = await this.forecastService.compute(id)
    return { rows }
  }

  @Patch(':id/overrides')
  async patchOverrides(
    @Param('id') id: string,
    @Body() body: { sku: string; patch: Partial<ManualOverrides> },
  ) {
    await this.forecastService.applyOverride(id, body.sku, body.patch)
    const rows = await this.forecastService.compute(id)
    return { rows, recalculatedAt: new Date().toISOString() }
  }

  @Get(':id/search')
  async searchSkus(
    @Param('id') id: string,
    @Query('q') q: string,
  ) {
    return this.forecastService.searchSkus(id, q ?? '')
  }

  @Post(':id/recalculate')
  async recalculate(@Param('id') id: string) {
    const rows = await this.forecastService.compute(id)
    return {
      rows,
      recalculatedAt: new Date().toISOString(),
    }
  }

  @Get(':id/export/:tab')
  async exportTab(
    @Param('id') id: string,
    @Param('tab') tab: AnnualTab,
    @Res() res: Response,
  ) {
    const csv = await this.forecastService.exportTabCsv(id, tab)
    const filename = `${tab}-plan.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csv)
  }
}

