import Papa from 'papaparse'
import type { AnnualTab, ComputedSkuRow } from '@gno/shared'
import { MONTH_INDEXES, monthHeader } from '@gno/shared'

function downloadCsv(filename: string, rows: Record<string, string | number>[]): void {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function monthFields(values: number[], labels: string[]) {
  const out: Record<string, string | number> = {}
  MONTH_INDEXES.forEach((m, i) => {
    out[monthHeader(m, labels)] = Math.round(values[i] * 100) / 100
  })
  return out
}

const identityCols = (row: ComputedSkuRow) => ({
  sku: row.sku,
  asin: row.asin,
  title: row.title,
})

export function rowsForTab(
  tab: AnnualTab,
  rows: ComputedSkuRow[],
  labels: string[],
): Record<string, string | number>[] {
  switch (tab) {
    case 'forecast':
      return rows.map((row) => ({
        ...identityCols(row),
        avg_forecast_excl_zero: Math.round(row.avgForecastExclZero * 100) / 100,
        multiple: row.growthMultiple,
        fallback_units: row.fallbackUnits,
        ...monthFields(row.forecast, labels),
      }))
    case 'eom':
      return rows.map((row) => ({
        ...identityCols(row),
        buffer_months: row.bufferMonths,
        [monthHeader(0, labels)]: row.startingStock,
        ...monthFields(row.eom, labels),
      }))
    case 'purchase':
      return rows.map((row) => ({
        ...identityCols(row),
        lead_time_days: row.leadTimeDays,
        landing_offset_months: row.landingOffset,
        ...monthFields(row.orders, labels),
      }))
    case 'sales':
      return rows.map((row) => ({
        ...identityCols(row),
        selling_price: Math.round(row.sellingPrice * 100) / 100,
        ...monthFields(row.sales, labels),
        eight_month_total: Math.round(row.totalSales * 100) / 100,
      }))
  }
}

export function exportTabCsv(tab: AnnualTab, rows: ComputedSkuRow[], labels: string[]): void {
  const names: Record<AnnualTab, string> = {
    forecast: 'forecast-units.csv',
    eom: 'eom-stock.csv',
    purchase: 'purchase-plan.csv',
    sales: 'product-sales.csv',
  }
  downloadCsv(names[tab], rowsForTab(tab, rows, labels))
}

export function exportAllCsvs(rows: ComputedSkuRow[], labels: string[]): void {
  ;(['forecast', 'eom', 'purchase', 'sales'] as AnnualTab[]).forEach((tab, i) => {
    window.setTimeout(() => exportTabCsv(tab, rows, labels), i * 120)
  })
}
