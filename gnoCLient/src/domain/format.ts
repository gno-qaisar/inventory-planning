const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const usdPrecise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const compact = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

export function formatUsd(value: number): string {
  return usd.format(Number.isFinite(value) ? value : 0)
}

export function formatUsdPrecise(value: number): string {
  return usdPrecise.format(Number.isFinite(value) ? value : 0)
}

export function formatInt(value: number): string {
  return int.format(Math.round(Number.isFinite(value) ? value : 0))
}

export function formatNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0'
  return compact.format(Number(value.toFixed(digits)))
}

export function parseNumericInput(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

export function clampNonNegative(value: number): number {
  return Math.max(0, value)
}
