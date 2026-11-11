import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @CreateDateColumn()
  createdAt: Date

  @Column({ type: 'varchar', nullable: true })
  salesFileName: string | null

  @Column({ type: 'varchar', nullable: true })
  inventoryFileName: string | null

  @Column({ type: 'varchar', nullable: true })
  xlsxFileName: string | null

  @Column({ type: 'int', default: 0 })
  skuCount: number

  @Column({ type: 'text', nullable: true })
  notes: string | null
}

