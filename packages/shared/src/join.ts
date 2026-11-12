import type { InventoryRow, JoinSummary, SalesRow, SkuInputs } from './types'
import { emptyOverrides } from './constants'

export function skuKey(sku: string, asin: string): string {
  return (sku || asin).trim()
}

export function normalizeMonthKey(m: unknown): string | null {
  if (!m) return null
  const str = String(m).trim()
  const isoMatch = str.match(/^(\d{4})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return null
}

export interface HistoryAgg {
  sku: string
  asin: string
  parentAsin: string
  monthsWithSales: number
  units: number
  nonzeroMonths: number
  sales: number
  orderedUnits: number
  unitsByMonth: Record<string, number>
  netUnitsByMonth: Record<string, number>
}

export function aggregateSales(rows: SalesRow[]): {
  bySku: Map<string, HistoryAgg>
  byAsin: Map<string, HistoryAgg>
  all: Map<string, HistoryAgg>
} {
  const all = new Map<string, HistoryAgg>()
  const bySku = new Map<string, HistoryAgg>()
  const byAsin = new Map<string, HistoryAgg>()

  for (const row of rows) {
    const s = (row.sku || '').trim()
    const a = (row.asin || '').trim()
    const key = s || a
    if (!key) continue

    let agg = (s ? bySku.get(s) : null) || (a ? byAsin.get(a) : null) || all.get(key)
    if (!agg) {
      agg = {
        sku: s || key,
        asin: a,
        parentAsin: row.parentAsin || '',
        monthsWithSales: 0,
        units: 0,
        nonzeroMonths: 0,
        sales: 0,
        orderedUnits: 0,
        unitsByMonth: {},
        netUnitsByMonth: {},
      }
      all.set(key, agg)
    }

    if (s && !agg.sku) agg.sku = s
    if (a && !agg.asin) agg.asin = a
    if (s) bySku.set(s, agg)
    if (a) byAsin.set(a, agg)

    const netUnits =
      row.netUnitsSold !== undefined && row.netUnitsSold !== null && !isNaN(row.netUnitsSold)
        ? row.netUnitsSold
        : (row.unitsOrdered || 0)
    const salesAmount =
      row.netProductSales !== undefined && row.netProductSales !== null && !isNaN(row.netProductSales)
        ? row.netProductSales
        : (row.orderedProductSales || 0)

    agg.monthsWithSales += 1
    agg.units += netUnits
    if (netUnits > 0) agg.nonzeroMonths += 1
    agg.sales += salesAmount
    agg.orderedUnits += row.unitsOrdered || 0

    const monthKey = normalizeMonthKey(row.month)
    if (monthKey) {
      agg.unitsByMonth[monthKey] = (agg.unitsByMonth[monthKey] ?? 0) + netUnits
      agg.netUnitsByMonth[monthKey] = (agg.netUnitsByMonth[monthKey] ?? 0) + netUnits
    }
  }

  return { bySku, byAsin, all }
}

/**
 * FBA on-hand starting inventory (excluding 3PL/warehouse, which is tracked separately in threePlInventory).
 */
export function startingStock(row: InventoryRow): number {
  return (row.fbaActive || 0) + (row.fbaReserved || 0) + (row.fbaInbound || 0) + (row.awdTotal || 0)
}

export function summarizeJoin(salesRows: SalesRow[], inventoryRows: InventoryRow[]): JoinSummary {
  const { bySku, byAsin, all } = aggregateSales(salesRows)
  const matchedSkus = new Set<string>()
  let newOrPartial = 0

  for (const row of inventoryRows) {
    const s = (row.sku || '').trim()
    const a = (row.asin || '').trim()
    const hist = (s ? bySku.get(s) : null) || (a ? byAsin.get(a) : null)
    if (hist && hist.nonzeroMonths > 0) {
      matchedSkus.add(hist.sku || hist.asin)
    } else {
      newOrPartial += 1
    }
  }

  let delisted = 0
  for (const [key, agg] of all) {
    if (!matchedSkus.has(agg.sku || agg.asin || key)) {
      delisted += 1
    }
  }

  return {
    matchedSkus: matchedSkus.size,
    newOrPartialHistorySkus: newOrPartial,
    delistedSkus: delisted,
  }
}

export function buildSkuInputs(salesRows: SalesRow[], inventoryRows: InventoryRow[]): SkuInputs[] {
  const { bySku, byAsin, all } = aggregateSales(salesRows)

  // Merge multiple inventory rows for the same product across marketplaces
  const mergedInv = new Map<string, InventoryRow>()
  for (const row of inventoryRows) {
    const key = (row.sku || row.asin).trim()
    if (!key) continue
    const existing = mergedInv.get(key)
    if (existing) {
      existing.fbaActive = (existing.fbaActive || 0) + (row.fbaActive || 0)
      existing.fbaReserved = (existing.fbaReserved || 0) + (row.fbaReserved || 0)
      existing.fbaInbound = (existing.fbaInbound || 0) + (row.fbaInbound || 0)
      existing.awdTotal = (existing.awdTotal || 0) + (row.awdTotal || 0)
      existing.warehouse = (existing.warehouse || 0) + (row.warehouse || 0)
      existing.fbaFull = (existing.fbaFull || 0) + (row.fbaFull || 0)
      if (!existing.title && row.title) existing.title = row.title
      if (!existing.asin && row.asin) existing.asin = row.asin
    } else {
      mergedInv.set(key, { ...row })
    }
  }

  const bySkuResult = new Map<string, SkuInputs>()
  const claimedHistory = new Set<HistoryAgg>()

  for (const [key, row] of mergedInv) {
    const s = (row.sku || '').trim()
    const a = (row.asin || '').trim()
    const hist = (s ? bySku.get(s) : null) || (a ? byAsin.get(a) : null)
    if (hist) claimedHistory.add(hist)

    const hasHistory = Boolean(hist && hist.nonzeroMonths > 0)
    const historyAvgUnits = hist && hist.nonzeroMonths > 0 ? hist.units / hist.nonzeroMonths : 0
    const historySellingPrice =
      hist && hist.orderedUnits > 0 ? hist.sales / hist.orderedUnits : 0

    bySkuResult.set(key, {
      sku: row.sku || hist?.sku || key,
      asin: row.asin || hist?.asin || '',
      parentAsin: hist?.parentAsin || '',
      title: row.title,
      hasHistory,
      inInventory: true,
      historyAvgUnits,
      historySellingPrice,
      historyUnitsByMonth: hist?.unitsByMonth ?? {},
      historyNetUnitsByMonth: hist?.netUnitsByMonth ?? {},
      startingStock: startingStock(row),
      threePlInventory: row.warehouse || 0,
      inventoryInProduction: 0,
      currentInbound: row.fbaInbound || 0,
      inboundPipeline: 0,
      velocity: row.velocity,
      overrides: emptyOverrides(),
    })
  }

  for (const [key, hist] of all) {
    if (claimedHistory.has(hist)) continue
    const historyAvgUnits = hist.nonzeroMonths > 0 ? hist.units / hist.nonzeroMonths : 0
    bySkuResult.set(key, {
      sku: hist.sku || key,
      asin: hist.asin,
      parentAsin: hist.parentAsin,
      title: '(Delisted / no inventory row)',
      hasHistory: hist.nonzeroMonths > 0,
      inInventory: false,
      historyAvgUnits,
      historySellingPrice: hist.orderedUnits > 0 ? hist.sales / hist.orderedUnits : 0,
      historyUnitsByMonth: hist.unitsByMonth,
      historyNetUnitsByMonth: hist.netUnitsByMonth,
      startingStock: 0,
      threePlInventory: 0,
      inventoryInProduction: 0,
      currentInbound: 0,
      inboundPipeline: 0,
      velocity: 0,
      overrides: emptyOverrides(),
    })
  }

  return [...bySkuResult.values()].sort((a, b) => a.sku.localeCompare(b.sku))
}
