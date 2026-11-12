import { Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

export class OverridePatchDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  growthMultiple?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  fallbackUnits?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  bufferMonths?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  leadTimeDays?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  inboundPipeline?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  threePlInventory?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  inventoryInProduction?: number

  @IsOptional()
  @IsObject()
  forecastByMonth?: Record<string, number>

  @IsOptional()
  @IsObject()
  ordersByMonth?: Record<string, number>

  @IsOptional()
  @IsObject()
  multiplesPerMonth?: Record<string, number>
}

export class PatchOverrideDto {
  @IsString()
  @IsNotEmpty()
  sku!: string

  @ValidateNested()
  @Type(() => OverridePatchDto)
  patch!: OverridePatchDto
}
