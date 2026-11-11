import type { InventoryRow, JoinSummary, SalesRow, SkuInputs } from './types'
import { emptyOverrides } from './constants'

export function skuKey(sku: string, asin: string): string {
  return (sku || asin).trim()
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

export function aggregateSales(rows: SalesRow[]): Map<string, HistoryAgg> {
  const map = new Map<string, HistoryAgg>()
  for (const row of rows) {
    const key = skuKey(row.sku, row.asin)
    if (!key) continue
    const prev = map.get(key) ?? {
      sku: row.sku || key,
      asin: row.asin,
      parentAsin: row.parentAsin,
      monthsWithSales: 0,
      units: 0,
      nonzeroMonths: 0,
      sales: 0,
      orderedUnits: 0,
      unitsByMonth: {},
      netUnitsByMonth: {},
    }
    const units = row.netUnitsSold || row.unitsOrdered
    prev.asin = prev.asin || row.asin
    prev.sku = prev.sku || row.sku
    prev.parentAsin = prev.parentAsin || row.parentAsin
    prev.monthsWithSales += 1
    prev.units += units
    if (units > 0) prev.nonzeroMonths += 1
    prev.sales += row.orderedProductSales || row.netProductSales
    prev.orderedUnits += row.unitsOrdered
    const monthKey = String(row.month ?? '').slice(0, 7)
    if (/^\d{4}-\d{2}$/.test(monthKey)) {
      prev.unitsByMonth[monthKey] = (prev.unitsByMonth[monthKey] ?? 0) + units
      prev.netUnitsByMonth[monthKey] =
        (prev.netUnitsByMonth[monthKey] ?? 0) + (row.netUnitsSold || row.unitsOrdered)
    }
    map.set(key, prev)
  }
  return map
}

export function startingStock(row: InventoryRow): number {
  return row.fbaActive + row.fbaReserved + row.fbaInbound + row.awdTotal + row.warehouse
}

export function summarizeJoin(salesRows: SalesRow[], inventoryRows: InventoryRow[]): JoinSummary {
  const sales = aggregateSales(salesRows)
  const invKeys = new Set(inventoryRows.map((r) => skuKey(r.sku, r.asin)).filter(Boolean))
  const salesKeys = new Set(sales.keys())

  let matched = 0
  let newOrPartial = 0
  for (const key of invKeys) {
    const hist = sales.get(key)
    if (hist && hist.nonzeroMonths > 0) matched += 1
    else newOrPartial += 1
  }

  let delisted = 0
  for (const key of salesKeys) {
    if (!invKeys.has(key)) delisted += 1
  }

  return {
    matchedSkus: matched,
    newOrPartialHistorySkus: newOrPartial,
    delistedSkus: delisted,
  }
}

export function buildSkuInputs(salesRows: SalesRow[], inventoryRows: InventoryRow[]): SkuInputs[] {
  const sales = aggregateSales(salesRows)
  const bySku = new Map<string, SkuInputs>()

  for (const row of inventoryRows) {
    const key = skuKey(row.sku, row.asin)
    if (!key) continue
    const hist = sales.get(key)
    const hasHistory = Boolean(hist && hist.nonzeroMonths > 0)
    const historyAvgUnits = hist && hist.nonzeroMonths > 0 ? hist.units / hist.nonzeroMonths : 0
    const historySellingPrice =
      hist && hist.orderedUnits > 0 ? hist.sales / hist.orderedUnits : 0

    bySku.set(key, {
      sku: row.sku || key,
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
      currentInbound: row.fbaInbound,
      inboundPipeline: 0,
      velocity: row.velocity,
      overrides: emptyOverrides(),
    })
  }

  for (const [key, hist] of sales) {
    if (bySku.has(key)) continue
    const historyAvgUnits = hist.nonzeroMonths > 0 ? hist.units / hist.nonzeroMonths : 0
    bySku.set(key, {
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
      currentInbound: 0,
      inboundPipeline: 0,
      velocity: 0,
      overrides: emptyOverrides(),
    })
  }

  return [...bySku.values()].sort((a, b) => a.sku.localeCompare(b.sku))
}

