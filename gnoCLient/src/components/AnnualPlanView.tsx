import { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community'
import {
  buildMonthLabels,
  monthHeader,
  stockTone,
  MONTH_INDEXES,
  type ComputedSkuRow,
} from '@gno/shared'
import { formatInt } from '../domain/format'
import { gridTheme } from '../grid/theme'
import { useAppSelector } from '../store/hooks'
import { selectTotals, selectVisibleRows } from '../store/workspaceSlice'

const MONTH_LABELS = buildMonthLabels()

const centerStyle: CellStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}

// Matrix month cell matching prototype:
// <span class="annual-cell"><span class="sold">123</span><span class="left healthy">456</span></span>
interface MonthCellProps extends ICellRendererParams<ComputedSkuRow> {
  monthIndex: number
}

function MatrixMonthCell({ data, monthIndex }: MonthCellProps) {
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

// "All products" bottom pinned row cells matching prototype
interface PinnedCellProps extends ICellRendererParams<ComputedSkuRow> {
  monthIndex?: number
  isTotal?: boolean
}

function StackedPinnedCell({ data, monthIndex, isTotal }: PinnedCellProps) {
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

export function AnnualPlanView() {
  const visibleRows = useAppSelector(selectVisibleRows)
  const totals = useAppSelector(selectTotals)

  const columnDefs = useMemo<ColDef<ComputedSkuRow>[]>(() => {
    const baseCols: ColDef<ComputedSkuRow>[] = [
      {
        field: 'title',
        headerName: 'Product',
        pinned: 'left',
        width: 250,
        headerClass: 'text-center',
        cellClass: 'text-center',
        cellStyle: centerStyle,
        cellRenderer: (p: ICellRendererParams<ComputedSkuRow>) => {
          if (!p.data) return null
          if (p.data.sku === 'TOTAL') {
            return <strong>All products</strong>
          }
          return (
            <span
              className="title-cell prodname"
              title={p.data.title}
              style={{ textAlign: 'center', width: '100%' }}
            >
              {p.data.title || p.data.sku}
            </span>
          )
        },
      },
      {
        field: 'asin',
        headerName: 'ASIN',
        pinned: 'left',
        width: 125,
        cellClass: 'mono text-center',
        headerClass: 'text-center',
        cellStyle: centerStyle,
        valueGetter: (p) => (p.data?.sku === 'TOTAL' ? '' : p.data?.asin || ''),
      },
    ]

    const monthCols: ColDef<ComputedSkuRow>[] = MONTH_INDEXES.map((m, i) => ({
      colId: `m${m}`,
      headerName: monthHeader(m, MONTH_LABELS),
      width: 110,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: (p: ICellRendererParams<ComputedSkuRow>) => {
        if (p.data?.sku === 'TOTAL') {
          return <StackedPinnedCell {...p} monthIndex={i} />
        }
        return <MatrixMonthCell {...p} monthIndex={i} />
      },
    }))

    const totalCol: ColDef<ComputedSkuRow> = {
      colId: 'forecastTotal',
      headerName: 'Forecast total',
      width: 140,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: (p: ICellRendererParams<ComputedSkuRow>) => {
        if (p.data?.sku === 'TOTAL') {
          return <StackedPinnedCell {...p} isTotal />
        }
        const totalUnits = p.data ? p.data.forecast.reduce((a, b) => a + b, 0) : 0
        return <span style={{ fontWeight: 600, textAlign: 'center', width: '100%' }}>{formatInt(totalUnits)}</span>
      },
    }

    return [...baseCols, ...monthCols, totalCol]
  }, [])

  // Pinned "All products" bottom row
  const pinnedBottomRowData = useMemo<ComputedSkuRow[]>(() => {
    const totalFcByMonth = MONTH_INDEXES.map((_, i) =>
      visibleRows.reduce((sum, r) => sum + (r.forecast[i] || 0), 0),
    )
    const totalStockByMonth = MONTH_INDEXES.map((_, i) =>
      visibleRows.reduce((sum, r) => sum + (r.eom[i] || 0), 0),
    )
    const totalUnits = totalFcByMonth.reduce((a, b) => a + b, 0)

    const totalRow: ComputedSkuRow = {
      sku: 'TOTAL',
      asin: '',
      parentAsin: '',
      title: 'All products',
      hasHistory: true,
      inInventory: true,
      needsManualInput: false,
      isCritical: false,
      isEdited: false,
      growthMultiple: 1,
      fallbackUnits: 0,
      bufferMonths: 0,
      leadTimeDays: 0,
      landingOffset: 0,
      sellingPrice: 0,
      avgForecastExclZero: 0,
      startingStock: 0,
      currentInbound: 0,
      historyNetUnitsByMonth: {},
      forecast: totalFcByMonth,
      eom: totalStockByMonth,
      orders: totalFcByMonth,
      sales: totals.monthlySales,
      totalSales: totals.projectedSales,
      totalOrders: totalUnits,
      unitsToOrder: totalUnits,
      firstRiskMonth: null,
      firstRiskMonthName: '—',
      orderBy: '—',
      forecastOverrideMonths: new Set(),
      orderMonths: new Set(),
    }
    return [totalRow]
  }, [visibleRows, totals])

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
        pinnedBottomRowData={pinnedBottomRowData}
        getRowId={(p) => p.data.sku}
        headerHeight={36}
        rowHeight={38}
        animateRows={false}
        enableCellTextSelection
        getRowClass={(p) => (p.data?.sku === 'TOTAL' ? 'total-row' : undefined)}
      />
    </div>
  )
}
