import type { ICellRendererParams } from 'ag-grid-community'
import { stockTone, type ComputedSkuRow } from '@gno/shared'
import { formatInt } from '../../domain/format'

export interface MonthCellProps extends ICellRendererParams<ComputedSkuRow> {
  monthIndex: number
}

export function MatrixMonthCell({ data, monthIndex }: MonthCellProps) {
  if (!data) return null
  const forecastUnits = data.forecast?.[monthIndex] ?? 0
  const stockLeft = data.eom?.[monthIndex] ?? 0
  const tone = stockTone(stockLeft, data.avgForecastExclZero, data.bufferMonths)
  const health = tone === 'red' ? 'stockoutRisk' : tone === 'yellow' ? 'belowBuffer' : 'healthy'

  return (
    <span className="annual-cell">
      <span className="sold">{formatInt(forecastUnits)}</span>
      <span className={`left ${health}`}>{formatInt(stockLeft)}</span>
    </span>
  )
}

export interface PinnedCellProps extends ICellRendererParams<ComputedSkuRow> {
  monthIndex?: number
  isTotal?: boolean
}

export function StackedPinnedCell({ data, monthIndex, isTotal }: PinnedCellProps) {
  if (!data) return null
  if (isTotal) {
    const totalFc = data.forecast?.reduce((a, b) => a + b, 0) || 0
    return <span style={{ fontWeight: 600, textAlign: 'center', width: '100%' }}>{formatInt(totalFc)}</span>
  }

  const idx = monthIndex ?? 0
  const fcUnits = data.forecast?.[idx] ?? 0
  const stockUnits = data.eom?.[idx] ?? 0

  return (
    <span className="annual-cell">
      <span className="sold">{formatInt(fcUnits)}</span>
      <span className="left" style={{ color: 'var(--gray-700)' }}>{formatInt(stockUnits)}</span>
    </span>
  )
}

