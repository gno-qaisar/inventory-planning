import { Controller, Get, Query } from '@nestjs/common'
import { HistoryService } from './history.service'

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async getHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = limit ? Math.max(1, parseInt(limit, 10)) : 50
    const o = offset ? Math.max(0, parseInt(offset, 10)) : 0
    return this.historyService.getHistory(l, o)
  }
}

