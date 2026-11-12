import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Override } from '../../db/entities/override.entity'

@Injectable()
export class OverrideRepository {
  constructor(
    @InjectRepository(Override)
    private readonly repo: Repository<Override>,
  ) {}

  async findBySession(sessionId: string): Promise<Override[]> {
    return this.repo.find({ where: { sessionId } })
  }

  async findOne(sessionId: string, sku: string): Promise<Override | null> {
    return this.repo.findOne({ where: { sessionId, sku } })
  }

  create(data: Partial<Override>): Override {
    return this.repo.create(data)
  }

  async save(override: Override): Promise<Override> {
    return this.repo.save(override)
  }
}

