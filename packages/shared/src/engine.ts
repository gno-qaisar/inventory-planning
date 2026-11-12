import {
  DEFAULT_ANCHOR_DATE,
  DEFAULT_BUFFER_MONTHS,
  DEFAULT_FALLBACK_UNITS,
  DEFAULT_GROWTH_MULTIPLE,
  DEFAULT_LEAD_TIME_DAYS,
  STOCK_GREEN_FACTOR,
} from './constants'
import { buildMonthLabels, monthHeader } from './monthLabels'
import type { ComputedSkuRow, MonthIndex, SkuInputs } from './types'
import { HORIZON_MONTHS, MONTH_INDEXES } from './types'

export { DEFAULT_ANCHOR_DATE }

export function landingOffsetMonths(leadTimeDays: number): number {
  return Math.round(leadTimeDays / 30)
}

export function stockTone(
  eom: number,
  avgMonthlyForecast: number,
  bufferMonths: number,
): 'green' | 'yellow' | 'red' {
  if (eom <= 0) return 'red'
  const threshold = STOCK_GREEN_FACTOR * avgMonthlyForecast * bufferMonths
  if (eom > threshold) return 'green'
  return 'yellow'
}

function resolvedInputs(sku: SkuInputs) {
  const growthMultiple = sku.overrides?.growthMultiple ?? DEFAULT_GROWTH_MULTIPLE
  const fallbackUnits = sku.overrides?.fallbackUnits ?? DEFAULT_FALLBACK_UNITS
  const bufferMonths = sku.overrides?.bufferMonths ?? DEFAULT_BUFFER_MONTHS
  const leadTimeDays = sku.overrides?.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS
  const sellingPrice = sku.overrides?.sellingPrice ?? sku.historySellingPrice
  return { growthMultiple, fallbackUnits, bufferMonths, leadTimeDays, sellingPrice }
}

export function forecastMonthKey(index: MonthIndex, anchor: Date = DEFAULT_ANCHOR_DATE): string | null {
  const forecastMonth = new Date(anchor.getFullYear(), anchor.getMonth() + index, 1)
  const priorYearMonth = new Date(forecastMonth.getFullYear() - 1, forecastMonth.getMonth(), 1)
  return `${priorYearMonth.getFullYear()}-${String(priorYearMonth.getMonth() + 1).padStart(2, '0')}`
}

export function priorYearMonthKey(index: number, anchor: Date = DEFAULT_ANCHOR_DATE): string {
  const forecastMonth = new Date(anchor.getFullYear(), anchor.getMonth() + index, 1)
  const priorYearMonth = new Date(forecastMonth.getFullYear() - 1, forecastMonth.getMonth(), 1)
  return `${priorYearMonth.getFullYear()}-${String(priorYearMonth.getMonth() + 1).padStart(2, '0')}`
}

function monthForecast(
  sku: SkuInputs,
  month: MonthIndex,
  growthMultiple: number,
  fallbackUnits: number,
  anchor: Date = DEFAULT_ANCHOR_DATE,
): { value: number; usedFallback: boolean } {
  const key = forecastMonthKey(month, anchor)
  if (!key) return { value: fallbackUnits, usedFallback: true }
  const exactHistory = Object.prototype.hasOwnProperty.call(sku.historyUnitsByMonth, key)
  if (!exactHistory) return { value: fallbackUnits, usedFallback: true }
  return {
    value: Math.max(0, (sku.historyUnitsByMonth[key] ?? 0) * growthMultiple),
    usedFallback: false,
  }
}

export function suggestOrders(
  forecasts: number[],
  bufferMonths: number,
  leadTimeDays: number,
  startingUnits: number,
  currentInbound: number,
  existingOrders: number[] = Array(HORIZON_MONTHS).fill(0),
): number[] {
  const nonzeroForecast = forecasts.filter((u) => u > 0)
  const avg =
    nonzeroForecast.length > 0 ? nonzeroForecast.reduce((s, u) => s + u, 0) / nonzeroForecast.length : 0
  const threshold = STOCK_GREEN_FACTOR * avg * bufferMonths
  const shift = landingOffsetMonths(leadTimeDays)
  const orders = [...existingOrders]

  for (let month = shift; month < HORIZON_MONTHS; month++) {
    const arr = Array(HORIZON_MONTHS).fill(0)
    arr[0] += currentInbound
    orders.forEach((q, placed) => {
      const at = placed + shift
      if (q > 0 && at < HORIZON_MONTHS) arr[at] += q
    })

    let ending = startingUnits
    for (let m = 0; m <= month; m++) ending += arr[m] - forecasts[m]
    const missing = Math.ceil(threshold) + 1 - ending
    if (missing > 0) orders[month - shift] += missing
  }
  return orders
}

export function computeSkuRow(sku: SkuInputs, anchor: Date = DEFAULT_ANCHOR_DATE): ComputedSkuRow {
  const { growthMultiple, fallbackUnits, bufferMonths, leadTimeDays, sellingPrice } =
    resolvedInputs(sku)
  const offset = landingOffsetMonths(leadTimeDays)
  const forecast: number[] = []
  const forecastOverrideMonths: MonthIndex[] = []
  let usedFallbackMonth = false

  for (const m of MONTH_INDEXES) {
    const override = sku.overrides?.forecastByMonth?.[m]
    if (override !== undefined) {
      forecastOverrideMonths.push(m)
      forecast.push(Math.max(0, override))
    } else {
      const perMonthMult = sku.overrides?.multiplesPerMonth?.[m]
      const effectiveMultiple = perMonthMult !== undefined ? perMonthMult : growthMultiple
      const result = monthForecast(sku, m, effectiveMultiple, fallbackUnits, anchor)
      usedFallbackMonth = usedFallbackMonth || result.usedFallback
      forecast.push(result.value)
    }
  }

  const manualOrders: number[] = []
  const orderMonths: MonthIndex[] = []
  for (const m of MONTH_INDEXES) {
    const qty = Math.max(0, sku.overrides?.ordersByMonth?.[m] ?? 0)
    manualOrders.push(qty)
    if (qty > 0) orderMonths.push(m)
  }

  const threePlInventory = Math.max(0, sku.overrides?.threePlInventory ?? sku.threePlInventory ?? 0)
  const inventoryInProduction = Math.max(
    0,
    sku.overrides?.inventoryInProduction ?? sku.inventoryInProduction ?? 0,
  )
  const totalAvailableStock = sku.startingStock + threePlInventory

  const manualLandingByMonth = Array.from({ length: HORIZON_MONTHS }, () => 0)
  // Inbound lands in Month 1 (index 0): pipeline, currentInbound, and units already in production
  manualLandingByMonth[0] += (sku.currentInbound ?? 0) + (sku.inboundPipeline ?? 0) + inventoryInProduction

  for (let i = 0; i < HORIZON_MONTHS; i += 1) {
    const landIndex = i + offset
    if (landIndex < HORIZON_MONTHS) manualLandingByMonth[landIndex] += manualOrders[i]
  }

  const eom: number[] = []
  let stock = totalAvailableStock
  for (let i = 0; i < HORIZON_MONTHS; i += 1) {
    stock = stock + manualLandingByMonth[i] - forecast[i]
    eom.push(stock)
  }

  const nonzeroForecast = forecast.filter((n) => n > 0)
  const avgForecastExclZero =
    nonzeroForecast.length > 0
      ? nonzeroForecast.reduce((a, b) => a + b, 0) / nonzeroForecast.length
      : 0

  const manualTotalOrders = manualOrders.reduce((a, b) => a + b, 0)
  const suggestedOrders = suggestOrders(
    forecast,
    bufferMonths,
    leadTimeDays,
    totalAvailableStock,
    manualLandingByMonth[0],
    manualOrders,
  )
  const suggestedOrderUnits = suggestedOrders.reduce(
    (s, q, m) => s + Math.max(0, q - manualOrders[m]),
    0,
  )
  const unitsToOrder = manualTotalOrders > 0 ? manualTotalOrders : suggestedOrderUnits

  let firstRiskMonth: number | null = null
  for (let i = 0; i < HORIZON_MONTHS; i += 1) {
    if (stockTone(eom[i], avgForecastExclZero, bufferMonths) !== 'green') {
      firstRiskMonth = i + 1
      break
    }
  }

  const monthLabels = buildMonthLabels(anchor)
  let orderBy = '—'
  if (firstRiskMonth !== null) {
    const orderMonthIndex = firstRiskMonth - offset
    if (orderMonthIndex <= 1) {
      orderBy = 'Now'
    } else {
      orderBy = monthHeader(orderMonthIndex, monthLabels)
    }
  }
  const firstRiskMonthName = firstRiskMonth !== null ? monthHeader(firstRiskMonth, monthLabels) : '—'

  const sales = forecast.map((units) => units * sellingPrice)

  const hasPerMonthMultiples = Boolean(
    sku.overrides?.multiplesPerMonth &&
      Object.keys(sku.overrides.multiplesPerMonth).length > 0,
  )

  const isEdited =
    sku.overrides?.growthMultiple !== undefined ||
    sku.overrides?.fallbackUnits !== undefined ||
    sku.overrides?.bufferMonths !== undefined ||
    sku.overrides?.leadTimeDays !== undefined ||
    sku.overrides?.sellingPrice !== undefined ||
    hasPerMonthMultiples ||
    forecastOverrideMonths.length > 0 ||
    orderMonths.length > 0

  const needsManualInput =
    sku.inInventory &&
    (usedFallbackMonth || !sku.hasHistory || sku.historyAvgUnits <= 0)
  const isCritical = eom.some((v) => v <= 0)

  return {
    sku: sku.sku,
    asin: sku.asin,
    parentAsin: sku.parentAsin,
    title: sku.title,
    hasHistory: sku.hasHistory,
    inInventory: sku.inInventory,
    needsManualInput,
    isCritical,
    isEdited,
    growthMultiple,
    fallbackUnits,
    bufferMonths,
    leadTimeDays,
    landingOffset: offset,
    sellingPrice,
    avgForecastExclZero,
    startingStock: sku.startingStock,
    currentInbound: sku.currentInbound,
    historyNetUnitsByMonth: sku.historyNetUnitsByMonth,
    forecast,
    eom,
    orders: manualOrders,
    sales,
    totalSales: sales.reduce((a, b) => a + b, 0),
    totalOrders: manualTotalOrders,
    unitsToOrder,
    firstRiskMonth,
    firstRiskMonthName,
    orderBy,
    forecastOverrideMonths,
    orderMonths,
    multiplesPerMonth: sku.overrides?.multiplesPerMonth ?? {},
    threePlInventory,
    inventoryInProduction,
    totalAvailableStock,
  }
}

export function computeAllRows(skus: SkuInputs[], anchor: Date = DEFAULT_ANCHOR_DATE): ComputedSkuRow[] {
  return skus.map((sku) => computeSkuRow(sku, anchor))
}

export function workspaceTotals(rows: ComputedSkuRow[]) {
  return {
    projectedSales: rows.reduce((s, r) => s + r.totalSales, 0),
    unitsToOrder: rows.reduce((s, r) => s + r.totalOrders, 0),
    stockoutSkus: rows.filter((r) => r.isCritical).length,
    missingHistorySkus: rows.filter((r) => r.needsManualInput).length,
    monthlySales: MONTH_INDEXES.map((_, i) => rows.reduce((s, r) => s + r.sales[i], 0)),
  }
}
