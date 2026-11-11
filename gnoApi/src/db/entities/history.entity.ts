import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('history')
export class HistoryLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number

  @Column({ type: 'varchar', nullable: true })
  sessionId: string | null

  @Column({ type: 'varchar' })
  eventType: string

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>

  @CreateDateColumn()
  createdAt: Date
}

