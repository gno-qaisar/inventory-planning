import {
  INVENTORY_HEADERS,
  SALES_HEADERS,
  type CsvKind,
} from '../types'

const ALIASES: Record<string, string> = {
  fba_active: 'fbaactive',
  fba_reserved: 'fbareserved',
  fba_inbound: 'fbainbound',
  awd_total: 'awdtotal',
  fba_full: 'fbafull',
}

export function normalizeHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
}

export function canonicalHeader(raw: string): string {
  const n = normalizeHeader(raw)
  return ALIASES[n] ?? n
}

const SALES_CANON = new Set(SALES_HEADERS.map((h) => canonicalHeader(h)))
const INVENTORY_CANON = new Set(INVENTORY_HEADERS.map((h) => canonicalHeader(h)))

export function detectCsvKind(headers: string[]): CsvKind {
  const set = new Set(headers.map(canonicalHeader))
  const salesHits = [...SALES_CANON].filter((h) => set.has(h)).length
  const invHits = [...INVENTORY_CANON].filter((h) => set.has(h)).length

  if (salesHits >= 5 && salesHits > invHits) return 'sales'
  if (invHits >= 5 && invHits > salesHits) return 'inventory'
  return 'unknown'
}

export function missingRequiredHeaders(headers: string[], kind: CsvKind): string[] {
  const set = new Set(headers.map(canonicalHeader))
  const required = kind === 'sales' ? SALES_HEADERS : kind === 'inventory' ? INVENTORY_HEADERS : []
  return required.filter((h) => !set.has(canonicalHeader(h)))
}

