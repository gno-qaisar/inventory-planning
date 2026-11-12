import { useEffect, useMemo, useState } from 'react'
import {
  buildMonthLabels,
  monthHeader,
  stockTone,
  priorYearMonthKey,
  getWorstHealth,
  suggestOrders,
  DEFAULT_GROWTH_MULTIPLE,
  DEFAULT_LEAD_TIME_DAYS,
  DEFAULT_BUFFER_MONTHS,
  MONTH_INDEXES,
  type ComputedSkuRow,
  type ManualOverrides,
  type MonthIndex,
} from '@gno/shared'
import { formatInt } from '../domain/format'

const MONTH_LABELS = buildMonthLabels()

interface Props {
  row: ComputedSkuRow
  onClose: () => void
  onOverride: (sku: string, patch: Partial<ManualOverrides>) => void
}

export function AdjustPlanModal({ row, onClose, onOverride }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  const [localLeadTime, setLocalLeadTime] = useState(String(row.leadTimeDays))
  const [localBuffer, setLocalBuffer] = useState(String(row.bufferMonths))

  const [localMultiples, setLocalMultiples] = useState<Partial<Record<MonthIndex, string>>>(() => {
    const init: Partial<Record<MonthIndex, string>> = {}
    for (const m of MONTH_INDEXES) {
      const perMonth = row.multiplesPerMonth?.[m]
      init[m] = String(perMonth !== undefined ? perMonth : row.growthMultiple || 1.1)
    }
    return init
  })

  const [localOrders, setLocalOrders] = useState<Partial<Record<MonthIndex, string>>>(() => {
    const init: Partial<Record<MonthIndex, string>> = {}
    for (const [i, m] of MONTH_INDEXES.entries()) {
      init[m] = String(row.orders[i] || 0)
    }
    return init
  })

  useEffect(() => {
    setLocalLeadTime(String(row.leadTimeDays))
    setLocalBuffer(String(row.bufferMonths))
    const mults: Partial<Record<MonthIndex, string>> = {}
    const ords: Partial<Record<MonthIndex, string>> = {}
    for (const [i, m] of MONTH_INDEXES.entries()) {
      const pm = row.multiplesPerMonth?.[m]
      mults[m] = String(pm !== undefined ? pm : row.growthMultiple || 1.1)
      ords[m] = String(row.orders[i] || 0)
    }
    setLocalMultiples(mults)
    setLocalOrders(ords)
  }, [row])

  const commitLeadTime = () => {
    const v = parseFloat(localLeadTime)
    if (!isNaN(v) && v > 0 && v !== row.leadTimeDays) onOverride(row.sku, { leadTimeDays: v })
  }

  const commitBuffer = () => {
    const v = parseFloat(localBuffer)
    if (!isNaN(v) && v >= 0 && v !== row.bufferMonths) onOverride(row.sku, { bufferMonths: v })
  }

  const commitMultiple = (month: MonthIndex, valStr: string) => {
    const v = parseFloat(valStr)
    if (!isNaN(v) && v >= 0) {
      onOverride(row.sku, { multiplesPerMonth: { [month]: v } })
    }
  }

  const commitOrder = (month: MonthIndex, valStr: string) => {
    const v = parseInt(valStr, 10)
    const val = isNaN(v) ? 0 : Math.max(0, v)
    onOverride(row.sku, { ordersByMonth: { [month]: val } })
  }

  const handleSuggestOrders = () => {
    const starting = row.startingStock + (row.threePlInventory ?? 0)
    const currentInbound = (row.currentInbound || 0) + (row.inventoryInProduction || 0)
    const orders = suggestOrders(
      row.forecast,
      Number(localBuffer) || DEFAULT_BUFFER_MONTHS,
      Number(localLeadTime) || DEFAULT_LEAD_TIME_DAYS,
      starting,
      currentInbound,
      Array(8).fill(0),
    )

    const newOrdersMap: Partial<Record<MonthIndex, number>> = {}
    MONTH_INDEXES.forEach((m, idx) => {
      const qty = orders[idx] || 0
      newOrdersMap[m] = qty
      setLocalOrders((p) => ({ ...p, [m]: String(qty) }))
    })
    onOverride(row.sku, { ordersByMonth: newOrdersMap })
  }

  const handleReset = () => {
    const clearedMultiples: Partial<Record<MonthIndex, number>> = {}
    const clearedOrders: Partial<Record<MonthIndex, number>> = {}
    for (const m of MONTH_INDEXES) {
      clearedMultiples[m] = DEFAULT_GROWTH_MULTIPLE
      clearedOrders[m] = 0
    }
    setLocalLeadTime(String(DEFAULT_LEAD_TIME_DAYS))
    setLocalBuffer(String(DEFAULT_BUFFER_MONTHS))
    setLocalMultiples(
      Object.fromEntries(MONTH_INDEXES.map((m) => [m, String(DEFAULT_GROWTH_MULTIPLE)])),
    )
    setLocalOrders(
      Object.fromEntries(MONTH_INDEXES.map((m) => [m, '0'])),
    )
    onOverride(row.sku, {
      leadTimeDays: DEFAULT_LEAD_TIME_DAYS,
      bufferMonths: DEFAULT_BUFFER_MONTHS,
      growthMultiple: DEFAULT_GROWTH_MULTIPLE,
      multiplesPerMonth: clearedMultiples,
      ordersByMonth: clearedOrders,
    })
  }

  const inboundByMonth = useMemo(() => {
    const landing = Array.from({ length: 8 }, () => 0)
    landing[0] += (row.currentInbound || 0) + (row.inventoryInProduction || 0)
    for (let i = 0; i < 8; i++) {
      const landIndex = i + row.landingOffset
      if (landIndex < 8) landing[landIndex] += row.orders[i]
    }
    return landing
  }, [row])

  const fba = row.startingStock
  const threePl = row.threePlInventory ?? 0
  const inProd = row.inventoryInProduction ?? 0
  const worstHealth = getWorstHealth(row)
  const healthLabel =
    worstHealth === 'stockoutRisk'
      ? 'currently stockout risk'
      : worstHealth === 'belowBuffer'
        ? 'below buffer'
        : 'healthy'

  const leadMonths = Math.round(Number(localLeadTime) / 30) || 3

  return (
    <>
      <div className="overlay" onClick={onClose} role="presentation" />
      <div className="drawer open" role="dialog" aria-modal="true" aria-label="Adjust Plan">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose} type="button" aria-label="Close drawer">
            ×
          </button>
          <h2>{row.title || row.sku}</h2>
          <div className="meta">
            {row.asin} · {row.sku} · {formatInt(fba)} FBA · {formatInt(threePl)} 3PL ·{' '}
            {formatInt(inProd)} in production · {healthLabel}
          </div>
        </div>

        <div className="controls">
          <label>
            Lead time (days)
            <input
              className="edit-input"
              style={{ width: 96, textAlign: 'center' }}
              value={localLeadTime}
              onChange={(e) => setLocalLeadTime(e.target.value)}
              onBlur={commitLeadTime}
            />
          </label>
          <label>
            Buffer (months)
            <input
              className="edit-input"
              style={{ width: 96, textAlign: 'center' }}
              value={localBuffer}
              onChange={(e) => setLocalBuffer(e.target.value)}
              onBlur={commitBuffer}
            />
          </label>
          <span className="hint">
            Orders placed in a month arrive ~{leadMonths} month{leadMonths === 1 ? '' : 's'} later.
          </span>
          <div className="actions">
            <button type="button" className="btn" onClick={handleSuggestOrders}>
              ✦ Suggest orders
            </button>
            <button type="button" className="btn ghost" onClick={handleReset}>
              ↺ Reset
            </button>
          </div>
        </div>

        <div className="plan-table">
          <table>
            <thead>
              <tr>
                <th className="rowlabel"></th>
                {MONTH_INDEXES.map((m) => (
                  <th key={m} className="num">
                    {monthHeader(m, MONTH_LABELS)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 1. Units sold last year */}
              <tr>
                <td className="rowlabel">Units sold last year</td>
                {MONTH_INDEXES.map((m, i) => {
                  const key = priorYearMonthKey(i + 1)
                  return (
                    <td key={m} className="val">
                      {formatInt(row.historyNetUnitsByMonth[key] ?? 0)}
                    </td>
                  )
                })}
              </tr>

              {/* 2. Multiple */}
              <tr>
                <td className="rowlabel">
                  Multiple
                  <span className="sub">vs same month last year</span>
                </td>
                {MONTH_INDEXES.map((m) => (
                  <td key={m}>
                    <input
                      type="number"
                      step={0.05}
                      className="edit-input cell-input"
                      value={localMultiples[m] ?? '1.1'}
                      onChange={(e) => {
                        const val = e.target.value
                        setLocalMultiples((p) => ({ ...p, [m]: val }))
                      }}
                      onBlur={(e) => commitMultiple(m, e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* 3. Forecast units */}
              <tr>
                <td className="rowlabel">Forecast units</td>
                {MONTH_INDEXES.map((m, i) => (
                  <td key={m} className="val strong">
                    {formatInt(row.forecast[i])}
                  </td>
                ))}
              </tr>

              {/* 4. Starting inventory */}
              <tr>
                <td className="rowlabel">Starting inventory</td>
                {MONTH_INDEXES.map((m, i) => {
                  const val = i === 0 ? row.startingStock : row.eom[i - 1]
                  return (
                    <td
                      key={m}
                      className="val"
                      style={{ color: val < 0 ? 'var(--red-text)' : undefined }}
                    >
                      {formatInt(val)}
                    </td>
                  )
                })}
              </tr>

              {/* 5. Inbound (arriving) */}
              <tr>
                <td className="rowlabel">Inbound (arriving)</td>
                {MONTH_INDEXES.map((m, i) => (
                  <td key={m} className="val">
                    {inboundByMonth[i] > 0 ? formatInt(inboundByMonth[i]) : '0'}
                  </td>
                ))}
              </tr>

              {/* 6. Order quantity */}
              <tr>
                <td className="rowlabel">
                  Order quantity
                  <span className="sub">units placed this month</span>
                </td>
                {MONTH_INDEXES.map((m) => (
                  <td key={m}>
                    <input
                      type="number"
                      className="edit-input cell-input"
                      value={localOrders[m] ?? '0'}
                      min={0}
                      onChange={(e) => {
                        const val = e.target.value
                        setLocalOrders((p) => ({ ...p, [m]: val }))
                      }}
                      onBlur={(e) => commitOrder(m, e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* 7. End of month */}
              <tr>
                <td className="rowlabel">End of month</td>
                {MONTH_INDEXES.map((m, i) => {
                  const eomVal = row.eom[i]
                  const tone = stockTone(eomVal, row.avgForecastExclZero, row.bufferMonths)
                  const h =
                    tone === 'red' ? 'stockoutRisk' : tone === 'yellow' ? 'belowBuffer' : 'healthy'
                  return (
                    <td key={m}>
                      <span className={`end ${h}`}>{formatInt(eomVal)}</span>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>

          <p className="plan-note">
            Green: ends above 25% of the average monthly forecast × buffer. Yellow: positive but
            below the buffer. Red: projected stockout. Adjust multiples and orders until every month
            stays green.
          </p>
        </div>
      </div>
    </>
  )
}
