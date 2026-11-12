import { useMemo } from 'react'
import { exportAllCsvs } from '../csv/export'
import { buildMonthLabels } from '@gno/shared'
import { useAppDispatch } from '../store/hooks'
import { openUpload } from '../store/workspaceSlice'
import { useForecastData } from '../store/useForecastData'

export function TopBar() {
  const dispatch = useAppDispatch()
  const { loaded, rawRows } = useForecastData()
  const monthLabels = useMemo(() => buildMonthLabels(), [])

  return (
    <header className="topbar">
      <h1>Inventory Forecasting</h1>
      <span
        className="info-icon"
        title="Next 8 months from your sales history: forecast, projected stock, and when to reorder. Open &quot;Adjust plan&quot; on a product to tune multiples, lead time, buffer, and purchase orders."
      >
        i
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="btn sm" onClick={() => dispatch(openUpload())}>
          Upload CSVs
        </button>
        <button
          type="button"
          className="btn sm gold"
          disabled={!loaded}
          onClick={() => exportAllCsvs(rawRows, monthLabels)}
        >
          Export All (CSV)
        </button>
        <span className="proto-badge">Prototype · mock data</span>
      </div>
    </header>
  )
}
