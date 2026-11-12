import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Session } from '../../db/entities/session.entity'

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
  ) {}

  async findById(id: string): Promise<Session> {
    const session = await this.repo.findOne({ where: { id } })
    if (!session) {
      throw new NotFoundException(`Session with ID '${id}' not found`)
    }
    return session
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repo.count({ where: { id } })
    return count > 0
  }

  async updateSkuCount(id: string, count: number): Promise<void> {
    await this.repo.update(id, { skuCount: count })
  }
}
