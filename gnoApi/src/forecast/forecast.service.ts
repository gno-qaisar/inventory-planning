import { Injectable, Logger } from '@nestjs/common'
import {
  buildSkuInputs,
  computeAllRows,
  type ComputedSkuRow,
  type InventoryRow,
  type ManualOverrides,
  type MonthIndex,
  type SalesRow,
  type SkuInputs,
} from '@gno/shared'
import { HistoryService } from '../history/history.service'
import { OverrideRepository } from './repositories/override.repository'
import { RawDataRepository } from './repositories/raw-data.repository'
import { SessionRepository } from './repositories/session.repository'

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name)

  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly rawDataRepo: RawDataRepository,
    private readonly overrideRepo: OverrideRepository,
    private readonly historyService: HistoryService,
  ) {}

  async loadSkuInputs(
    inventorySessionId: string,
    salesSessionId?: string,
  ): Promise<SkuInputs[]> {
    // Verifies session exists or throws 404
    await this.sessionRepo.findById(inventorySessionId)
    const sIdSales = salesSessionId || inventorySessionId
    if (salesSessionId && salesSessionId !== inventorySessionId) {
      await this.sessionRepo.findById(salesSessionId)
    }

    const rawSales = await this.rawDataRepo.findSales(sIdSales)
    const rawInventories = await this.rawDataRepo.findInventory(inventorySessionId)

    const salesRows: SalesRow[] = rawSales.map((r) => ({
      month: r.month ?? '',
      asin: r.asin ?? '',
      sku: r.sku ?? '',
      parentAsin: r.parentAsin ?? '',
      unitsOrdered: r.unitsOrdered || 0,
      orderedProductSales: r.orderedProductSales || 0,
      netUnitsSold: r.netUnitsSold || 0,
      netProductSales: r.netProductSales || 0,
      currency: r.currency || 'USD',
    }))

    const inventoryRows: InventoryRow[] = rawInventories.map((r) => ({
      marketplace: r.marketplace ?? '',
      asin: r.asin ?? '',
      sku: r.sku ?? '',
      title: r.title ?? '',
      velocity: r.velocity || 0,
      fbaActive: r.fbaActive || 0,
      fbaReserved: r.fbaReserved || 0,
      fbaInbound: r.fbaInbound || 0,
      awdTotal: r.awdTotal || 0,
      warehouse: r.warehouse || 0,
      fbaFull: r.fbaFull || 0,
    }))

    const skus = buildSkuInputs(salesRows, inventoryRows)

    // Load overrides for this session
    const overrides = await this.overrideRepo.findBySession(inventorySessionId)
    const overrideMap = new Map(overrides.map((o) => [o.sku, o]))

    for (const sku of skus) {
      const ov = overrideMap.get(sku.sku)
      if (ov) {
        sku.overrides = {
          growthMultiple: ov.growthMultiple ?? undefined,
          fallbackUnits: ov.fallbackUnits ?? undefined,
          bufferMonths: ov.bufferMonths ?? undefined,
          leadTimeDays: ov.leadTimeDays ?? undefined,
          sellingPrice: ov.sellingPrice ?? undefined,
          forecastByMonth: (ov.forecastByMonth as Record<MonthIndex, number>) ?? {},
          ordersByMonth: (ov.ordersByMonth as Record<MonthIndex, number>) ?? {},
          multiplesPerMonth: (ov.multiplesPerMonth as Record<MonthIndex, number>) ?? {},
          threePlInventory: ov.threePlInventory ?? undefined,
          inventoryInProduction: ov.inventoryInProduction ?? undefined,
        }
        sku.inboundPipeline = ov.inboundPipeline ?? 0
      }
    }

    return skus
  }

  async compute(
    inventorySessionId: string,
    salesSessionId?: string,
  ): Promise<ComputedSkuRow[]> {
    const skuInputs = await this.loadSkuInputs(inventorySessionId, salesSessionId)
    return computeAllRows(skuInputs)
  }

  async createSession(
    salesSessionId: string,
    inventorySessionId: string,
  ): Promise<{ sessionId: string; rows: ComputedSkuRow[] }> {
    const sessionId = inventorySessionId || salesSessionId
    const rows = await this.compute(inventorySessionId, salesSessionId)
    await this.sessionRepo.updateSkuCount(sessionId, rows.length)
    this.logger.log(`Created forecast session ${sessionId} with ${rows.length} SKUs`)
    return { sessionId, rows }
  }

  async applyOverride(
    sessionId: string,
    sku: string,
    patch: Partial<ManualOverrides> & { inboundPipeline?: number },
  ): Promise<void> {
    await this.sessionRepo.findById(sessionId)

    let override = await this.overrideRepo.findOne(sessionId, sku)
    if (!override) {
      override = this.overrideRepo.create({
        sessionId,
        sku,
        forecastByMonth: {},
        ordersByMonth: {},
        multiplesPerMonth: {},
      })
    }

    if (patch.growthMultiple !== undefined) override.growthMultiple = patch.growthMultiple
    if (patch.fallbackUnits !== undefined) override.fallbackUnits = patch.fallbackUnits
    if (patch.bufferMonths !== undefined) override.bufferMonths = patch.bufferMonths
    if (patch.leadTimeDays !== undefined) override.leadTimeDays = patch.leadTimeDays
    if (patch.sellingPrice !== undefined) override.sellingPrice = patch.sellingPrice
    if (patch.inboundPipeline !== undefined) override.inboundPipeline = patch.inboundPipeline
    if (patch.threePlInventory !== undefined) override.threePlInventory = patch.threePlInventory
    if (patch.inventoryInProduction !== undefined) {
      override.inventoryInProduction = patch.inventoryInProduction
    }

    if (patch.forecastByMonth) {
      override.forecastByMonth = {
        ...(override.forecastByMonth ?? {}),
        ...patch.forecastByMonth,
      }
    }
    if (patch.ordersByMonth) {
      override.ordersByMonth = {
        ...(override.ordersByMonth ?? {}),
        ...patch.ordersByMonth,
      }
    }
    if (patch.multiplesPerMonth) {
      override.multiplesPerMonth = {
        ...(override.multiplesPerMonth ?? {}),
        ...patch.multiplesPerMonth,
      }
    }

    await this.overrideRepo.save(override)
    await this.historyService.logEvent(sessionId, 'patch_override', { sku, patch })
  }
}
