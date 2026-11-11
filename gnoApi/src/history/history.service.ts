import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { HistoryLog } from '../db/entities/history.entity'

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(HistoryLog)
    private readonly historyRepo: Repository<HistoryLog>,
  ) {}

  async logEvent(
    sessionId: string | null,
    eventType: string,
    payload: Record<string, unknown> = {},
  ): Promise<HistoryLog> {
    const entry = this.historyRepo.create({
      sessionId,
      eventType,
      payload,
    })
    return this.historyRepo.save(entry)
  }

  async getHistory(limit = 50, offset = 0): Promise<{ items: HistoryLog[]; total: number }> {
    const [items, total] = await this.historyRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    })
    return { items, total }
  }
}

