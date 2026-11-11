import Papa from 'papaparse'
import type { InventoryRow, ParsedCsvFile, SalesRow } from '@gno/shared'
import { canonicalHeader, detectCsvKind, missingRequiredHeaders } from '@gno/shared'
import { fingerprintFile } from './fingerprint'

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number(String(value ?? '').replace(/[$,]/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

function toText(value: unknown): string {
  return String(value ?? '').trim()
}

function get(row: Record<string, unknown>, ...keys: string[]): unknown {
  const map = new Map(Object.entries(row).map(([k, v]) => [canonicalHeader(k), v]))
  for (const key of keys) {
    const hit = map.get(canonicalHeader(key))
    if (hit !== undefined && hit !== '') return hit
  }
  return ''
}

function parseSales(rows: Record<string, unknown>[]): SalesRow[] {
  return rows
    .map((row) => ({
      month: toText(get(row, 'month')),
      asin: toText(get(row, 'asin')),
      sku: toText(get(row, 'sku')),
      parentAsin: toText(get(row, 'parent_asin')),
      unitsOrdered: toNumber(get(row, 'units_ordered')),
      orderedProductSales: toNumber(get(row, 'ordered_product_sales')),
      netUnitsSold: toNumber(get(row, 'net_units_sold')),
      netProductSales: toNumber(get(row, 'net_product_sales')),
      currency: toText(get(row, 'currency')) || 'USD',
    }))
    .filter((row) => row.sku || row.asin)
}

function parseInventory(rows: Record<string, unknown>[]): InventoryRow[] {
  return rows
    .map((row) => ({
      marketplace: toText(get(row, 'marketplace')),
      asin: toText(get(row, 'asin')),
      sku: toText(get(row, 'sku')),
      title: toText(get(row, 'title')),
      velocity: toNumber(get(row, 'velocity')),
      fbaActive: toNumber(get(row, 'fbaActive')),
      fbaReserved: toNumber(get(row, 'fbaReserved')),
      fbaInbound: toNumber(get(row, 'fbaInbound')),
      awdTotal: toNumber(get(row, 'awdTotal')),
      warehouse: toNumber(get(row, 'warehouse')),
      fbaFull: toNumber(get(row, 'fbaFull')),
    }))
    .filter((row) => row.sku || row.asin)
}

export async function parseCsvFile(file: File): Promise<ParsedCsvFile> {
  const fingerprint = await fingerprintFile(file)
  const text = await file.text()

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
      complete: (result) => {
        const headers = (result.meta.fields ?? []).filter(Boolean)
        const kind = detectCsvKind(headers)
        resolve({
          file,
          fingerprint,
          headers,
          kind,
          missingHeaders: missingRequiredHeaders(headers, kind),
          salesRows: kind === 'sales' ? parseSales(result.data) : [],
          inventoryRows: kind === 'inventory' ? parseInventory(result.data) : [],
        })
      },
      error: (error: Error) => reject(error),
    })
  })
}
