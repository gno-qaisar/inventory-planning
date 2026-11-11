import type { MonthIndex } from './types'
import { MONTH_INDEXES } from './types'

export const DEFAULT_GROWTH_MULTIPLE = 1
export const DEFAULT_FALLBACK_UNITS = 0
export const DEFAULT_BUFFER_MONTHS = 2
export const DEFAULT_LEAD_TIME_DAYS = 90
export const STOCK_GREEN_FACTOR = 0.25
export const HASH_SLICE_BYTES = 65_536

export const MONTH_KEYS: MonthIndex[] = [...MONTH_INDEXES]

export function emptyOverrides() {
  return {
    forecastByMonth: {},
    ordersByMonth: {},
    multiplesPerMonth: {},
  }
}

