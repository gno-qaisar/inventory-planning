import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'
import { numericTransformer } from '../transformers/numeric.transformer'

@Entity('overrides')
@Unique(['sessionId', 'sku'])
export class Override {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number

  @Column({ type: 'varchar' })
  sessionId!: string

  @Column({ type: 'varchar' })
  sku!: string

  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer })
  growthMultiple?: number | null

  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer })
  fallbackUnits?: number | null

  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer })
  bufferMonths?: number | null

  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer })
  leadTimeDays?: number | null

  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer })
  sellingPrice?: number | null

  @Column({ type: 'jsonb', default: '{}' })
  forecastByMonth!: Record<string, number>

  @Column({ type: 'jsonb', default: '{}' })
  ordersByMonth!: Record<string, number>

  @Column({ type: 'jsonb', default: '{}' })
  multiplesPerMonth!: Record<string, number>

  @Column({ type: 'int', default: 0 })
  inboundPipeline!: number

  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer })
  threePlInventory?: number | null

  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer })
  inventoryInProduction?: number | null

  @UpdateDateColumn()
  updatedAt!: Date
}
