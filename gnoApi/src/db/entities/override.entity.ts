import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

@Entity('overrides')
@Unique(['sessionId', 'sku'])
export class Override {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number

  @Column({ type: 'varchar' })
  sessionId: string

  @Column({ type: 'varchar' })
  sku: string

  @Column({ type: 'numeric', nullable: true })
  growthMultiple: number | null

  @Column({ type: 'numeric', nullable: true })
  fallbackUnits: number | null

  @Column({ type: 'numeric', nullable: true })
  bufferMonths: number | null

  @Column({ type: 'numeric', nullable: true })
  leadTimeDays: number | null

  @Column({ type: 'numeric', nullable: true })
  sellingPrice: number | null

  @Column({ type: 'jsonb', default: '{}' })
  forecastByMonth: Record<string, number>

  @Column({ type: 'jsonb', default: '{}' })
  ordersByMonth: Record<string, number>

  @Column({ type: 'jsonb', default: '{}' })
  multiplesPerMonth: Record<string, number>

  @Column({ type: 'int', default: 0 })
  inboundPipeline: number

  @Column({ type: 'numeric', nullable: true })
  threePlInventory: number | null

  @Column({ type: 'numeric', nullable: true })
  inventoryInProduction: number | null

  @UpdateDateColumn()
  updatedAt: Date
}

