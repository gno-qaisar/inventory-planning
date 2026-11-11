import { useEffect } from 'react'
import { AnnualPlanView } from './components/AnnualPlanView'
import { KpiBar } from './components/KpiBar'
import { ProductsView } from './components/ProductsView'
import { RecalcDialog } from './components/RecalcDialog'
import { TopBar } from './components/TopBar'
import { UploadModal } from './components/UploadModal'
import { registerGridModules } from './grid/registerGrid'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { useLazyGetSessionQuery } from './store/api/forecastApi'
import {
  applyApiRows,
  selectLoaded,
  selectRows,
  selectWorkspace,
  setEomHealthFilter,
  setSearch,
  setSessionId,
  setView,
  type EomHealthFilter,
} from './store/workspaceSlice'

registerGridModules()

const STATUS_OPTS: { id: EomHealthFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'red', label: 'Stockout risk' },
  { id: 'yellow', label: 'Below buffer' },
  { id: 'green', label: 'Healthy' },
]

export default function App() {
  const dispatch = useAppDispatch()
  const workspace = useAppSelector(selectWorkspace)
  const rows = useAppSelector(selectRows)
  const loaded = useAppSelector(selectLoaded)
  const [fetchSession] = useLazyGetSessionQuery()

  useEffect(() => {
    const savedId =
      typeof window !== 'undefined' ? localStorage.getItem('gno_active_session_id') : null
    if (!savedId) return
    dispatch(setSessionId(savedId))
    void (async () => {
      try {
        const data = await fetchSession(savedId).unwrap()
        if (data?.rows && data.rows.length > 0) {
          dispatch(applyApiRows(data.rows))
        }
      } catch {
        localStorage.removeItem('gno_active_session_id')
      }
    })()
  }, [fetchSession, dispatch])

  const handleKpiFilter = (f: EomHealthFilter) => {
    dispatch(setEomHealthFilter(f))
  }

  return (
    <div className="app">
      <TopBar />

      <main>
        {loaded && (
          <KpiBar
            rows={rows}
            activeFilter={workspace.eomHealthFilter}
            onFilter={handleKpiFilter}
          />
        )}

        <div className="tabbar">
          <div
            className={`tab-unit${workspace.view === 'products' ? ' active' : ''}`}
            data-tabunit="products"
          >
            <button
              type="button"
              className="tab"
              data-tab="products"
              onClick={() => dispatch(setView('products'))}
            >
              Products
            </button>
          </div>

          <div
            className={`tab-unit${workspace.view === 'annual' ? ' active' : ''}`}
            data-tabunit="annual"
          >
            <button
              type="button"
              className="tab"
              data-tab="annual"
              onClick={() => dispatch(setView('annual'))}
            >
              Annual plan
            </button>
          </div>

          {workspace.view === 'annual' && (
            <span className="legend" id="annual-legend">
              each cell: <span className="muted">forecast sold</span> / <b>stock left</b>
            </span>
          )}

          <div className="seg" id="status-filter">
            {STATUS_OPTS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={workspace.eomHealthFilter === o.id ? 'active' : ''}
                onClick={() => dispatch(setEomHealthFilter(o.id))}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="search">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              id="search"
              placeholder="Search product, ASIN, SKU…"
              value={workspace.search}
              onChange={(e) => dispatch(setSearch(e.target.value))}
            />
          </div>
        </div>

        <div className="grid-wrap">
          {!loaded ? (
            <section className="empty-state">
              No workspace data. Upload a Sales History CSV and a Current Inventory CSV to begin.
            </section>
          ) : workspace.view === 'annual' ? (
            <AnnualPlanView />
          ) : (
            <ProductsView />
          )}
        </div>
      </main>

      <footer className="spec">
        <details>
          <summary>Developer notes — model &amp; implementation spec</summary>
          <ul>
            <li>
              <b>Data source:</b> this prototype uses seeded mock data. In production, read pre-ingested sales history (same 8 months one year prior) and the current inventory snapshot (FBA + reserved + inbound + AWD, 3PL, in-production) from the platform warehouse/caches — no live Sellerboard/Amazon calls.
            </li>
            <li>
              <b>Forecast:</b> <code>forecastUnits[m] = round(unitsSoldLastYear[m] × multiple[m])</code>. Default multiple 1.1.
            </li>
            <li>
              <b>Starting inventory:</b> <code>fbaUnits + threePlUnits</code>. First month seeded from this; each later month starts where the previous ended.
            </li>
            <li>
              <b>Inbound:</b> in-production units land in month 1. A purchase order placed in month <code>m</code> arrives in month <code>m + round(leadTimeDays / 30)</code>.
            </li>
            <li>
              <b>Month end:</b> <code>ending = starting + inbound − forecast</code>.
            </li>
            <li>
              <b>Health:</b> green if <code>ending &gt; 0.25 × avgMonthlyForecast × bufferMonths</code>; yellow if positive but below that; red if ≤ 0 (projected stockout).
            </li>
            <li>
              <b>Order-by:</b> latest month to place the next PO = <code>firstRiskMonth − leadTimeMonths</code> (clamped to 0 = &quot;Now&quot;). <b>Suggest orders</b> tops up each reachable month to stay green.
            </li>
            <li>
              <b>Scale:</b> prototype renders a plain table (300 mock rows). For thousands of SKUs use a virtualized grid (the platform uses AG Grid) — default sort by forecast revenue desc.
            </li>
          </ul>
        </details>
      </footer>

      <UploadModal />
      <RecalcDialog />
    </div>
  )
}
