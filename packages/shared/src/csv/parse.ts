import type { InventoryRow, SalesRow } from '../types'
import { canonicalHeader } from './headers'

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number(String(value ?? '').replace(/[$,]/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

export function toText(value: unknown): string {
  return String(value ?? '').trim()
}

export function getRawField(row: Record<string, unknown>, ...keys: string[]): unknown {
  const map = new Map(Object.entries(row).map(([k, v]) => [canonicalHeader(k), v]))
  for (const key of keys) {
    const hit = map.get(canonicalHeader(key))
    if (hit !== undefined && hit !== '') return hit
  }
  return ''
}

export function parseSalesRows(rawRows: Record<string, unknown>[]): SalesRow[] {
  return rawRows
    .map((row) => ({
      month: toText(getRawField(row, 'month')),
      asin: toText(getRawField(row, 'asin')),
      sku: toText(getRawField(row, 'sku')),
      parentAsin: toText(getRawField(row, 'parent_asin', 'parentAsin')),
      unitsOrdered: toNumber(getRawField(row, 'units_ordered', 'unitsOrdered')),
      orderedProductSales: toNumber(getRawField(row, 'ordered_product_sales', 'orderedProductSales')),
      netUnitsSold: toNumber(getRawField(row, 'net_units_sold', 'netUnitsSold')),
      netProductSales: toNumber(getRawField(row, 'net_product_sales', 'netProductSales')),
      currency: toText(getRawField(row, 'currency')) || 'USD',
    }))
    .filter((row) => row.sku || row.asin)
}

export function parseInventoryRows(rawRows: Record<string, unknown>[]): InventoryRow[] {
  return rawRows
    .map((row) => ({
      marketplace: toText(getRawField(row, 'marketplace')),
      asin: toText(getRawField(row, 'asin')),
      sku: toText(getRawField(row, 'sku')),
      title: toText(getRawField(row, 'title')),
      velocity: toNumber(getRawField(row, 'velocity')),
      fbaActive: toNumber(getRawField(row, 'fbaActive', 'fba_active')),
      fbaReserved: toNumber(getRawField(row, 'fbaReserved', 'fba_reserved')),
      fbaInbound: toNumber(getRawField(row, 'fbaInbound', 'fba_inbound')),
      awdTotal: toNumber(getRawField(row, 'awdTotal', 'awd_total')),
      warehouse: toNumber(getRawField(row, 'warehouse')),
      fbaFull: toNumber(getRawField(row, 'fbaFull', 'fba_full')),
    }))
    .filter((row) => row.sku || row.asin)
}

