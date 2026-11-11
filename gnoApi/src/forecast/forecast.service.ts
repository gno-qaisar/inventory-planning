import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as Papa from 'papaparse'
import {
  buildMonthLabels,
  buildSkuInputs,
  computeAllRows,
  monthHeader,
  MONTH_INDEXES,
  type AnnualTab,
  type ComputedSkuRow,
  type InventoryRow,
  type ManualOverrides,
  type SalesRow,
  type SkuInputs,
} from '@gno/shared'
import { Override } from '../db/entities/override.entity'
import { RawInventory } from '../db/entities/raw-inventory.entity'
import { RawSale } from '../db/entities/raw-sales.entity'
import { Session } from '../db/entities/session.entity'
import { HistoryService } from '../history/history.service'

@Injectable()
export class ForecastService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(RawSale)
    private readonly rawSaleRepo: Repository<RawSale>,
    @InjectRepository(RawInventory)
    private readonly rawInventoryRepo: Repository<RawInventory>,
    @InjectRepository(Override)
    private readonly overrideRepo: Repository<Override>,
    private readonly historyService: HistoryService,
  ) {}

  async loadSkuInputs(
    inventorySessionId: string,
    salesSessionId?: string,
  ): Promise<SkuInputs[]> {
    const sIdSales = salesSessionId || inventorySessionId

    const rawSales = await this.rawSaleRepo.find({
      where: { sessionId: sIdSales },
    })
    const rawInventories = await this.rawInventoryRepo.find({
      where: { sessionId: inventorySessionId },
    })

    const salesRows: SalesRow[] = rawSales.map((r) => ({
      month: r.month ?? '',
      asin: r.asin ?? '',
      sku: r.sku ?? '',
      parentAsin: r.parentAsin ?? '',
      unitsOrdered: Number(r.unitsOrdered) || 0,
      orderedProductSales: Number(r.orderedProductSales) || 0,
      netUnitsSold: Number(r.netUnitsSold) || 0,
      netProductSales: Number(r.netProductSales) || 0,
      currency: r.currency || 'USD',
    }))

    const inventoryRows: InventoryRow[] = rawInventories.map((r) => ({
      marketplace: r.marketplace ?? '',
      asin: r.asin ?? '',
      sku: r.sku ?? '',
      title: r.title ?? '',
      velocity: Number(r.velocity) || 0,
      fbaActive: Number(r.fbaActive) || 0,
      fbaReserved: Number(r.fbaReserved) || 0,
      fbaInbound: Number(r.fbaInbound) || 0,
      awdTotal: Number(r.awdTotal) || 0,
      warehouse: Number(r.warehouse) || 0,
      fbaFull: Number(r.fbaFull) || 0,
    }))

    const skus = buildSkuInputs(salesRows, inventoryRows)

    // Load overrides
    const overrides = await this.overrideRepo.find({
      where: { sessionId: inventorySessionId },
    })
    const overrideMap = new Map(overrides.map((o) => [o.sku, o]))

    for (const sku of skus) {
      const ov = overrideMap.get(sku.sku)
      if (ov) {
        sku.overrides = {
          growthMultiple:
            ov.growthMultiple !== null ? Number(ov.growthMultiple) : undefined,
          fallbackUnits:
            ov.fallbackUnits !== null ? Number(ov.fallbackUnits) : undefined,
          bufferMonths:
            ov.bufferMonths !== null ? Number(ov.bufferMonths) : undefined,
          leadTimeDays:
            ov.leadTimeDays !== null ? Number(ov.leadTimeDays) : undefined,
          sellingPrice:
            ov.sellingPrice !== null ? Number(ov.sellingPrice) : undefined,
          forecastByMonth: ov.forecastByMonth ?? {},
          ordersByMonth: ov.ordersByMonth ?? {},
          multiplesPerMonth: ov.multiplesPerMonth ?? {},
          threePlInventory:
            ov.threePlInventory !== null && ov.threePlInventory !== undefined
              ? Number(ov.threePlInventory)
              : undefined,
          inventoryInProduction:
            ov.inventoryInProduction !== null && ov.inventoryInProduction !== undefined
              ? Number(ov.inventoryInProduction)
              : undefined,
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
    const rows = computeAllRows(skuInputs)

    // Also update skuCount on session
    await this.sessionRepo.update(inventorySessionId, { skuCount: rows.length })

    return rows
  }

  async applyOverride(
    sessionId: string,
    sku: string,
    patch: Partial<ManualOverrides> & { inboundPipeline?: number },
  ): Promise<void> {
    let override = await this.overrideRepo.findOne({
      where: { sessionId, sku },
    })

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
    if (patch.inventoryInProduction !== undefined) override.inventoryInProduction = patch.inventoryInProduction

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

    await this.historyService.logEvent(sessionId, 'patch_override', {
      sku,
      patch,
    })
  }

  async searchSkus(sessionId: string, query: string): Promise<ComputedSkuRow[]> {
    const rows = await this.compute(sessionId)
    if (!query.trim()) return rows
    const q = query.trim().toLowerCase()
    return rows.filter(
      (r) =>
        r.sku.toLowerCase().includes(q) ||
        r.asin.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q),
    )
  }

  async exportTabCsv(sessionId: string, tab: AnnualTab): Promise<string> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } })
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`)
    }

    const rows = await this.compute(sessionId)
    const labels = buildMonthLabels()

    const identityCols = (row: ComputedSkuRow) => ({
      sku: row.sku,
      asin: row.asin,
      title: row.title,
    })

    const monthFields = (values: number[]) => {
      const out: Record<string, string | number> = {}
      MONTH_INDEXES.forEach((m, i) => {
        out[monthHeader(m, labels)] = Math.round((values[i] ?? 0) * 100) / 100
      })
      return out
    }

    let records: Record<string, string | number>[] = []

    switch (tab) {
      case 'forecast':
        records = rows.map((row) => ({
          ...identityCols(row),
          avg_forecast_excl_zero: Math.round(row.avgForecastExclZero * 100) / 100,
          multiple: row.growthMultiple,
          fallback_units: row.fallbackUnits,
          ...monthFields(row.forecast),
        }))
        break
      case 'eom':
        records = rows.map((row) => ({
          ...identityCols(row),
          buffer_months: row.bufferMonths,
          [monthHeader(0, labels)]: row.startingStock,
          ...monthFields(row.eom),
        }))
        break
      case 'purchase':
        records = rows.map((row) => ({
          ...identityCols(row),
          lead_time_days: row.leadTimeDays,
          landing_offset_months: row.landingOffset,
          ...monthFields(row.orders),
        }))
        break
      case 'sales':
        records = rows.map((row) => ({
          ...identityCols(row),
          selling_price: Math.round(row.sellingPrice * 100) / 100,
          ...monthFields(row.sales),
          eight_month_total: Math.round(row.totalSales * 100) / 100,
        }))
        break
      default:
        records = []
    }

    return Papa.unparse(records)
  }
}

