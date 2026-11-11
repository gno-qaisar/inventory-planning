import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('raw_inventory')
export class RawInventory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number

  @Column({ type: 'varchar' })
  sessionId: string

  @Column({ type: 'varchar', nullable: true })
  marketplace: string | null

  @Column({ type: 'varchar', nullable: true })
  asin: string | null

  @Column({ type: 'varchar', nullable: true })
  sku: string | null

  @Column({ type: 'varchar', nullable: true })
  title: string | null

  @Column({ type: 'numeric', default: 0 })
  velocity: number

  @Column({ type: 'int', default: 0 })
  fbaActive: number

  @Column({ type: 'int', default: 0 })
  fbaReserved: number

  @Column({ type: 'int', default: 0 })
  fbaInbound: number

  @Column({ type: 'int', default: 0 })
  awdTotal: number

  @Column({ type: 'int', default: 0 })
  warehouse: number

  @Column({ type: 'int', default: 0 })
  fbaFull: number
}

