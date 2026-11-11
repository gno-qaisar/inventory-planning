import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('raw_sales')
export class RawSale {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number

  @Column({ type: 'varchar' })
  sessionId: string

  @Column({ type: 'varchar', nullable: true })
  month: string | null

  @Column({ type: 'varchar', nullable: true })
  asin: string | null

  @Column({ type: 'varchar', nullable: true })
  sku: string | null

  @Column({ type: 'varchar', nullable: true })
  parentAsin: string | null

  @Column({ type: 'int', default: 0 })
  unitsOrdered: number

  @Column({ type: 'numeric', default: 0 })
  orderedProductSales: number

  @Column({ type: 'int', default: 0 })
  netUnitsSold: number

  @Column({ type: 'numeric', default: 0 })
  netProductSales: number

  @Column({ type: 'varchar', default: 'USD' })
  currency: string
}

