import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RawInventory } from '../../db/entities/raw-inventory.entity'
import { RawSale } from '../../db/entities/raw-sales.entity'

@Injectable()
export class RawDataRepository {
  constructor(
    @InjectRepository(RawSale)
    private readonly saleRepo: Repository<RawSale>,
    @InjectRepository(RawInventory)
    private readonly invRepo: Repository<RawInventory>,
  ) {}

  async findSales(sessionId: string): Promise<RawSale[]> {
    return this.saleRepo.find({ where: { sessionId } })
  }

  async findInventory(sessionId: string): Promise<RawInventory[]> {
    return this.invRepo.find({ where: { sessionId } })
  }
}
