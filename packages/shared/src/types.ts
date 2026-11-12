export const HORIZON_MONTHS = 8 as const
export const MONTH_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8] as const
export type MonthIndex = (typeof MONTH_INDEXES)[number]

export const SALES_HEADERS = [
  'month',
  'asin',
  'sku',
  'parent_asin',
  'units_ordered',
  'ordered_product_sales',
  'net_units_sold',
  'net_product_sales',
  'currency',
] as const

export const INVENTORY_HEADERS = [
  'marketplace',
  'asin',
  'sku',
  'title',
  'velocity',
  'fbaActive',
  'fbaReserved',
  'fbaInbound',
  'awdTotal',
  'warehouse',
  'fbaFull',
] as const

export type SalesHeader = (typeof SALES_HEADERS)[number]
export type InventoryHeader = (typeof INVENTORY_HEADERS)[number]
export type CsvKind = 'sales' | 'inventory' | 'unknown'

export interface SalesRow {
  month: string
  asin: string
  sku: string
  parentAsin: string
  unitsOrdered: number
  orderedProductSales: number
  netUnitsSold: number
  netProductSales: number
  currency: string
}

export interface InventoryRow {
  marketplace: string
  asin: string
  sku: string
  title: string
  velocity: number
  fbaActive: number
  fbaReserved: number
  fbaInbound: number
  awdTotal: number
  warehouse: number
  fbaFull: number
}

export interface FileFingerprint {
  name: string
  size: number
  hash: string
}

export interface ParsedCsvFile {
  file: unknown
  fingerprint: FileFingerprint
  headers: string[]
  kind: CsvKind
  missingHeaders: string[]
  salesRows: SalesRow[]
  inventoryRows: InventoryRow[]
}

export interface JoinSummary {
  matchedSkus: number
  newOrPartialHistorySkus: number
  delistedSkus: number
}

export type ValidationIssue =
  | { code: 'duplicate'; message: string }
  | { code: 'swapped'; message: string }
  | { code: 'same_schema'; message: string }
  | { code: 'missing_columns'; message: string; details: string[] }
  | { code: 'parse_error'; message: string }

export interface UploadValidation {
  issues: ValidationIssue[]
  canLoad: boolean
  summary: JoinSummary | null
}

export type WorkspaceView =
  | 'products'
  | 'annual'
  | 'asin'
  | 'sellerboard'
  | 'sellerboard-inventory'
  | 'history'
export type AnnualTab = 'forecast' | 'eom' | 'purchase' | 'sales'
export type SkuFilter = 'all' | 'critical' | 'needsInput'

export interface ManualOverrides {
  growthMultiple?: number
  fallbackUnits?: number
  bufferMonths?: number
  leadTimeDays?: number
  sellingPrice?: number
  forecastByMonth: Partial<Record<MonthIndex, number>>
  ordersByMonth: Partial<Record<MonthIndex, number>>
  multiplesPerMonth?: Partial<Record<MonthIndex, number>>
  threePlInventory?: number
  inventoryInProduction?: number
}

export interface SkuInputs {
  sku: string
  asin: string
  parentAsin: string
  title: string
  hasHistory: boolean
  inInventory: boolean
  historyAvgUnits: number
  historySellingPrice: number
  historyUnitsByMonth: Record<string, number>
  historyNetUnitsByMonth: Record<string, number>
  startingStock: number
  currentInbound: number
  inboundPipeline: number
  velocity: number
  overrides: ManualOverrides
  threePlInventory?: number
  inventoryInProduction?: number
}

export interface ComputedSkuRow {
  sku: string
  asin: string
  parentAsin: string
  title: string
  hasHistory: boolean
  inInventory: boolean
  needsManualInput: boolean
  isCritical: boolean
  isEdited: boolean
  growthMultiple: number
  fallbackUnits: number
  bufferMonths: number
  leadTimeDays: number
  landingOffset: number
  sellingPrice: number
  avgForecastExclZero: number
  startingStock: number
  currentInbound: number
  historyNetUnitsByMonth: Record<string, number>
  forecast: number[]
  eom: number[]
  orders: number[]
  sales: number[]
  totalSales: number
  totalOrders: number
  unitsToOrder: number
  firstRiskMonth: number | null
  firstRiskMonthName: string
  orderBy: string
  forecastOverrideMonths: MonthIndex[]
  orderMonths: MonthIndex[]
  multiplesPerMonth?: Partial<Record<MonthIndex, number>>
  threePlInventory?: number
  inventoryInProduction?: number
  totalAvailableStock?: number
}

export type DataStatus =
  | { kind: 'empty' }
  | { kind: 'failed' }
  | { kind: 'ready'; skuCount: number }

export interface SessionDto {
  id: string
  createdAt: string | Date
  skuCount: number
  salesFileName?: string | null
  inventoryFileName?: string | null
  xlsxFileName?: string | null
  notes?: string | null
}

export interface RecalcResponse {
  rows: ComputedSkuRow[]
  recalculatedAt?: string
}

export interface UploadCsvResponse {
  sessionId: string
  kind: CsvKind
  rowCount: number
  headers: string[]
  issues: string[]
}

export interface UploadXlsxResponse {
  sessionId: string
  sheets: string[]
  summaries: Record<string, number>
  asinCount?: number
  message?: string
}
