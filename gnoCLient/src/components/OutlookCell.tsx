import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ICellRendererParams } from 'ag-grid-community'
import type { ComputedSkuRow } from '@gno/shared'
import {
  buildMonthLabels,
  getWorstHealth,
  HEALTH_LABEL,
  MONTH_INDEXES,
  monthHeader,
  stockTone,
} from '@gno/shared'
import { formatInt } from '../domain/format'

const MONTH_LABELS = buildMonthLabels()

interface TooltipState {
  x: number
  y: number
  visible: boolean
}

export function OutlookCell({ data }: ICellRendererParams<ComputedSkuRow>) {
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, visible: false })
  const containerRef = useRef<HTMLDivElement>(null)

  if (!data || !data.eom || data.eom.length === 0) return null

  const healths = data.eom.map((v) => {
    const tone = stockTone(v, data.avgForecastExclZero, data.bufferMonths)
    return tone === 'red' ? 'stockoutRisk' : tone === 'yellow' ? 'belowBuffer' : 'healthy'
  })

  const worstHealth = getWorstHealth(data)

  const updatePosition = (e: React.MouseEvent) => {
    const pad = 14
    let x = e.clientX + pad
    let y = e.clientY + pad
    const tooltipWidth = 280
    const tooltipHeight = 240

    if (x + tooltipWidth > window.innerWidth) {
      x = e.clientX - tooltipWidth - pad
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = e.clientY - tooltipHeight - pad
    }

    setTooltip({ x, y, visible: true })
  }

  const handleMouseLeave = () => {
    setTooltip({ x: 0, y: 0, visible: false })
  }

  const tooltipNode =
    tooltip.visible && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="outlook-tooltip-card"
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            <div className="tt-head">
              <span title={data.title || data.sku}>{data.title || data.sku}</span>
              <span className="tt-status">{HEALTH_LABEL[worstHealth]}</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Month</th>
                  <th style={{ textAlign: 'right', paddingLeft: 16 }}>Sold</th>
                  <th style={{ textAlign: 'right', paddingLeft: 16 }}>Stock left</th>
                </tr>
              </thead>
              <tbody>
                {MONTH_INDEXES.map((_, i) => {
                  const eomVal = data.eom[i] ?? 0
                  const fcVal = data.forecast[i] ?? 0
                  const h = healths[i]
                  return (
                    <tr key={i}>
                      <td style={{ textAlign: 'left' }}>
                        {monthHeader(i + 1, MONTH_LABELS)}
                      </td>
                      <td style={{ textAlign: 'right', paddingLeft: 16 }}>
                        {formatInt(fcVal)}
                      </td>
                      <td style={{ textAlign: 'right', paddingLeft: 16 }}>
                        <span style={{ fontWeight: 500 }}>{formatInt(eomVal)}</span>{' '}
                        <span className={`dot ${h}`} style={{ marginLeft: 4 }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
      }}
      onMouseEnter={updatePosition}
      onMouseMove={updatePosition}
      onMouseLeave={handleMouseLeave}
    >
      <div className="outlook">
        {MONTH_INDEXES.map((_, i) => (
          <span key={i} className={`sq ${healths[i]}`} />
        ))}
      </div>
      {tooltipNode}
    </div>
  )
}
