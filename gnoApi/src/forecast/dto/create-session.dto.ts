import { IsUUID } from 'class-validator'

export class CreateSessionDto {
  @IsUUID('all', { message: 'salesSessionId must be a valid UUID' })
  salesSessionId!: string

  @IsUUID('all', { message: 'inventorySessionId must be a valid UUID' })
  inventorySessionId!: string
}
