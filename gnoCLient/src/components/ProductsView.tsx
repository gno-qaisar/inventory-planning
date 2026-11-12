import { useCallback, useEffect, useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community'
import {
  buildMonthLabels,
  monthHeader,
  stockTone,
  type ComputedSkuRow,
  type ManualOverrides,
} from '@gno/shared'
import { formatInt, formatUsd } from '../domain/format'
import { gridTheme } from '../grid/theme'
import { usePatchOverridesMutation } from '../store/api/forecastApi'
import { useForecastData } from '../store/useForecastData'
import { OutlookCell } from './OutlookCell'
import { AdjustPlanModal } from './AdjustPlanModal'

const MONTH_LABELS = buildMonthLabels()

const centerStyle: CellStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}

const HEALTH_LABEL = {
  healthy: 'Healthy',
  belowBuffer: 'Below buffer',
  stockoutRisk: 'Stockout risk',
}

function getWorstHealth(row: ComputedSkuRow): 'stockoutRisk' | 'belowBuffer' | 'healthy' {
  if (!row || !row.eom || !Array.isArray(row.eom) || row.eom.length === 0) return 'healthy'
  const tones = row.eom.map((v) => stockTone(v, row.avgForecastExclZero, row.bufferMonths))
  if (tones.some((t) => t === 'red')) return 'stockoutRisk'
  if (tones.some((t) => t === 'yellow')) return 'belowBuffer'
  return 'healthy'
}

// Status cell renderer
function StatusCell({ data }: ICellRendererParams<ComputedSkuRow>) {
  if (!data) return null
  const h = getWorstHealth(data)
  return (
    <span className={`status ${h}`}>
      <span className="dot" />
      <span>{HEALTH_LABEL[h]}</span>
    </span>
  )
}

// Product Title cell
function TitleCell({ data }: ICellRendererParams<ComputedSkuRow>) {
  if (!data) return null
  const titleText = data.title || data.sku || ''
  return (
    <span
      className="title-cell prodname"
      title={titleText}
      style={{ textAlign: 'center', width: '100%' }}
    >
      {titleText}
    </span>
  )
}

// Adjust Button Cell
interface AdjustBtnCellProps extends ICellRendererParams<ComputedSkuRow> {
  onOpen: (sku: string) => void
}

function AdjustBtnCell({ data, onOpen }: AdjustBtnCellProps) {
  if (!data || data.sku === 'TOTAL') return null
  return (
    <button
      type="button"
      className="btn sm"
      onClick={() => onOpen(data.sku)}
    >
      ☰ Adjust plan
    </button>
  )
}

// Editable 3PL Cell
interface EditInputProps extends ICellRendererParams<ComputedSkuRow> {
  field: 'threePlInventory' | 'inventoryInProduction'
  onSave: (sku: string, patch: Partial<ManualOverrides>) => void
}

function EditInputCell({ data, field, onSave }: EditInputProps) {
  const initial =
    field === 'threePlInventory' ? data?.threePlInventory ?? 0 : data?.inventoryInProduction ?? 0
  const [val, setVal] = useState(String(initial))

  useEffect(() => {
    setVal(String(initial))
  }, [initial])

  if (!data) return null

  return (
    <input
      className="edit-input"
      style={{ textAlign: 'center' }}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const num = Math.max(0, Math.round(Number(val) || 0))
        setVal(String(num))
        if (num !== initial) {
          onSave(data.sku, { [field]: num })
        }
      }}
    />
  )
}

export function ProductsView() {
  const { visibleRows, sessionId } = useForecastData()
  const [adjustSku, setAdjustSku] = useState<string | null>(null)
  const [patchApiOverrides] = usePatchOverridesMutation()

  const handleOverride = useCallback(
    async (sku: string, patch: Partial<ManualOverrides>) => {
      if (!sessionId) return
      try {
        await patchApiOverrides({ sessionId, sku, patch }).unwrap()
      } catch (err) {
        console.error('ProductsView: failed to patch override', err)
      }
    },
    [sessionId, patchApiOverrides],
  )

  const adjustRow = adjustSku ? visibleRows.find((r) => r.sku === adjustSku) ?? null : null

  const columnDefs = useMemo<ColDef<ComputedSkuRow>[]>(() => [
    {
      headerName: 'Product',
      field: 'title',
      colId: 'title',
      pinned: 'left',
      width: 230,
      minWidth: 190,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: TitleCell,
    },
    {
      headerName: 'Adjust',
      colId: 'adjust',
      pinned: 'left',
      width: 110,
      sortable: false,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: AdjustBtnCell,
      cellRendererParams: { onOpen: setAdjustSku },
    },
    {
      headerName: 'ASIN',
      field: 'asin',
      width: 110,
      headerClass: 'text-center',
      cellClass: 'mono text-center',
      cellStyle: centerStyle,
    },
    {
      headerName: 'Status',
      colId: 'status',
      width: 125,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: StatusCell,
      comparator: (_, __, nodeA, nodeB) => {
        const order = { stockoutRisk: 0, belowBuffer: 1, healthy: 2 }
        const hA = nodeA.data ? getWorstHealth(nodeA.data) : 'healthy'
        const hB = nodeB.data ? getWorstHealth(nodeB.data) : 'healthy'
        return (order[hA] ?? 3) - (order[hB] ?? 3)
      },
    },
    {
      headerName: '8-month outlook',
      colId: 'outlook',
      width: 130,
      sortable: false,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: OutlookCell,
    },
    {
      headerName: 'FBA on hand',
      colId: 'fba',
      width: 105,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      valueGetter: ({ data }) => data?.startingStock ?? 0,
      valueFormatter: ({ value }) => formatInt(Number(value)),
      cellRenderer: ({ value }: { value: number }) => (
        <span>{formatInt(Number(value) || 0)}</span>
      ),
    },
    {
      headerName: '3PL',
      colId: 'threePl',
      width: 85,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: EditInputCell,
      cellRendererParams: { field: 'threePlInventory', onSave: handleOverride },
    },
    {
      headerName: 'In production',
      colId: 'inProd',
      width: 95,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: EditInputCell,
      cellRendererParams: { field: 'inventoryInProduction', onSave: handleOverride },
    },
    {
      headerName: 'Forecast units',
      colId: 'forecastTotal',
      width: 110,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      valueGetter: ({ data }) => (data ? Math.round(data.forecast.reduce((s, v) => s + v, 0)) : 0),
      valueFormatter: ({ value }) => formatInt(Number(value)),
      cellRenderer: ({ value }: { value: number }) => (
        <span>{formatInt(Number(value) || 0)}</span>
      ),
    },
    {
      headerName: 'Forecast revenue',
      colId: 'forecastRevenue',
      width: 120,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      valueGetter: ({ data }) => data?.totalSales ?? 0,
      valueFormatter: ({ value }) => formatUsd(Number(value)),
      cellRenderer: ({ value }: { value: number }) => (
        <span>{formatUsd(Number(value) || 0)}</span>
      ),
    },
    {
      headerName: 'First risk',
      colId: 'firstRisk',
      width: 90,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      valueGetter: ({ data }) => {
        if (!data) return '—'
        return (
          data.firstRiskMonthName ||
          (data.firstRiskMonth ? monthHeader(data.firstRiskMonth, MONTH_LABELS) : '—')
        )
      },
    },
    {
      headerName: 'Order by',
      colId: 'orderBy',
      width: 90,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      valueGetter: ({ data }) => data?.orderBy || '—',
      cellRenderer: ({ data }: ICellRendererParams<ComputedSkuRow>) => {
        const val = data?.orderBy || '—'
        if (val === 'Now') {
          return <span className="order-now">Now</span>
        }
        return <span>{val}</span>
      },
    },
    {
      headerName: 'Units to order',
      colId: 'unitsToOrder',
      width: 110,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      valueGetter: ({ data }) => data?.unitsToOrder ?? 0,
      valueFormatter: ({ value }) => formatInt(Number(value) || 0),
      cellRenderer: ({ value }: { value: number }) => (
        <span>{formatInt(Number(value) || 0)}</span>
      ),
    },
  ], [handleOverride])

  const defaultColDef = useMemo<ColDef<ComputedSkuRow>>(() => ({
    resizable: true,
    sortable: true,
    suppressHeaderMenuButton: true,
    headerClass: 'text-center',
    cellClass: 'text-center',
    cellStyle: centerStyle,
  }), [])

  return (
    <div style={{ flex: 1, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <AgGridReact<ComputedSkuRow>
        theme={gridTheme}
        rowData={visibleRows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={(p) => p.data.sku}
        headerHeight={36}
        rowHeight={38}
        animateRows={false}
        enableCellTextSelection
      />

      {adjustRow && (
        <AdjustPlanModal
          row={adjustRow}
          onClose={() => setAdjustSku(null)}
          onOverride={handleOverride}
        />
      )}
    </div>
  )
}
