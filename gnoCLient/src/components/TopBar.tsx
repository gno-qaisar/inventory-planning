import { useMemo } from 'react'
import { exportAllCsvs } from '../csv/export'
import { buildMonthLabels } from '@gno/shared'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { openUpload, selectLoaded, selectRows } from '../store/workspaceSlice'

export function TopBar() {
  const dispatch = useAppDispatch()
  const loaded = useAppSelector(selectLoaded)
  const rows = useAppSelector(selectRows)
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
          onClick={() => exportAllCsvs(rows, monthLabels)}
        >
          Export All (CSV)
        </button>
        <span className="proto-badge">Prototype · mock data</span>
      </div>
    </header>
  )
}
