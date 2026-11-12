import { useMemo, type KeyboardEvent } from 'react'
import { getWorstTone } from '@gno/shared'
import type { ComputedSkuRow } from '@gno/shared'
import { formatInt, formatUsd } from '../domain/format'
import type { EomHealthFilter } from '../store/workspaceSlice'

interface Props {
  rows: ComputedSkuRow[]
  activeFilter: EomHealthFilter
  onFilter: (f: EomHealthFilter) => void
}

function formatRevenueCompact(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`
  return formatUsd(val)
}

export function KpiBar({ rows, activeFilter, onFilter }: Props) {
  const stats = useMemo(() => {
    let red = 0
    let yellow = 0
    let green = 0
    let orderNow = 0
    let totalForecastUnits = 0
    let totalRevenue = 0

    for (const row of rows) {
      const tone = getWorstTone(row)
      if (tone === 'red') red++
      else if (tone === 'yellow') yellow++
      else green++

      if (row.orderBy === 'Now') {
        orderNow++
      }

      totalForecastUnits += row.forecast.reduce((s, v) => s + v, 0)
      totalRevenue += row.totalSales
    }

    return { red, yellow, green, orderNow, totalForecastUnits, totalRevenue }
  }, [rows])

  const handleKeyDown = (f: EomHealthFilter) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onFilter(f)
    }
  }

  return (
    <div className="stats">
      {/* Products */}
      <div
        className={`stat slate${activeFilter === 'all' ? ' active' : ''}`}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-pressed={activeFilter === 'all'}
        onClick={() => onFilter('all')}
        onKeyDown={handleKeyDown('all')}
      >
        <span className="label">Products</span>
        <span className="value">{formatInt(rows.length)}</span>
      </div>

      {/* Order now */}
      <div
        className="stat red"
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-pressed={activeFilter === 'red'}
        onClick={() => onFilter(activeFilter === 'red' ? 'all' : 'red')}
        onKeyDown={handleKeyDown(activeFilter === 'red' ? 'all' : 'red')}
      >
        <span className="label">Order now</span>
        <span className="value">{formatInt(stats.orderNow)}</span>
      </div>

      {/* Stockout risk */}
      <div
        className={`stat red${activeFilter === 'red' ? ' active' : ''}`}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-pressed={activeFilter === 'red'}
        onClick={() => onFilter(activeFilter === 'red' ? 'all' : 'red')}
        onKeyDown={handleKeyDown(activeFilter === 'red' ? 'all' : 'red')}
      >
        <span className="label">Stockout risk</span>
        <span className="value">{formatInt(stats.red)}</span>
      </div>

      {/* Below buffer */}
      <div
        className={`stat amber${activeFilter === 'yellow' ? ' active' : ''}`}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-pressed={activeFilter === 'yellow'}
        onClick={() => onFilter(activeFilter === 'yellow' ? 'all' : 'yellow')}
        onKeyDown={handleKeyDown(activeFilter === 'yellow' ? 'all' : 'yellow')}
      >
        <span className="label">Below buffer</span>
        <span className="value">{formatInt(stats.yellow)}</span>
      </div>

      {/* Healthy */}
      <div
        className={`stat green${activeFilter === 'green' ? ' active' : ''}`}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-pressed={activeFilter === 'green'}
        onClick={() => onFilter(activeFilter === 'green' ? 'all' : 'green')}
        onKeyDown={handleKeyDown(activeFilter === 'green' ? 'all' : 'green')}
      >
        <span className="label">Healthy</span>
        <span className="value">{formatInt(stats.green)}</span>
      </div>

      {/* Forecast units (8 mo) */}
      <div className="stat gold">
        <span className="label">Forecast units (8 mo)</span>
        <span className="value">{formatInt(stats.totalForecastUnits)}</span>
      </div>

      {/* Forecast revenue (8 mo) */}
      <div className="stat gold">
        <span className="label">Forecast revenue (8 mo)</span>
        <span className="value">{formatRevenueCompact(stats.totalRevenue)}</span>
      </div>
    </div>
  )
}
