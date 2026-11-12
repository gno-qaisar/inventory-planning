import { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import {
  buildMonthLabels,
  monthHeader,
  MONTH_INDEXES,
  type ComputedSkuRow,
} from '@gno/shared'
import { formatInt } from '../domain/format'
import { gridTheme } from '../grid/theme'
import { centerStyle, defaultColDef } from '../grid/gridDefaults'
import { useForecastData } from '../store/useForecastData'
import { MatrixMonthCell, StackedPinnedCell } from './cells/AnnualPlanCells'
import { TitleCell } from './cells/TitleCell'

const MONTH_LABELS = buildMonthLabels()

export function AnnualPlanView() {
  const { visibleRows, totals } = useForecastData()

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
          if (p.data.sku === '__TOTAL_ROW__') {
            return <strong>All products</strong>
          }
          return <TitleCell {...p} />
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
        valueGetter: (p) => (p.data?.sku === '__TOTAL_ROW__' ? '' : p.data?.asin || ''),
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
        if (p.data?.sku === '__TOTAL_ROW__') {
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
        if (p.data?.sku === '__TOTAL_ROW__') {
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
      visibleRows.reduce((sum, r) => sum + Math.max(0, r.eom[i] || 0), 0),
    )
    const totalOrdersByMonth = MONTH_INDEXES.map((_, i) =>
      visibleRows.reduce((sum, r) => sum + (r.orders[i] || 0), 0),
    )
    const totalUnits = totalFcByMonth.reduce((a, b) => a + b, 0)
    const totalOrders = totalOrdersByMonth.reduce((a, b) => a + b, 0)
    const totalSales = visibleRows.reduce((sum, r) => sum + r.totalSales, 0)

    const totalRow: ComputedSkuRow = {
      sku: '__TOTAL_ROW__',
      asin: '',
      parentAsin: '',
      title: 'All products',
      hasHistory: true,
      inInventory: true,
      needsManualInput: false,
      isCritical: false,
      isEdited: false,
      growthMultiple: 1.1,
      fallbackUnits: 0,
      bufferMonths: 1,
      leadTimeDays: 0,
      landingOffset: 0,
      sellingPrice: 0,
      avgForecastExclZero: 0,
      startingStock: 0,
      currentInbound: 0,
      historyNetUnitsByMonth: {},
      forecast: totalFcByMonth,
      eom: totalStockByMonth,
      orders: totalOrdersByMonth,
      sales: totals.monthlySales,
      totalSales,
      totalOrders,
      unitsToOrder: totalOrders > 0 ? totalOrders : totalUnits,
      firstRiskMonth: null,
      firstRiskMonthName: '—',
      orderBy: '—',
      forecastOverrideMonths: [],
      orderMonths: [],
    }
    return [totalRow]
  }, [visibleRows, totals])

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
        suppressCellFocus={true}
        tooltipShowMode="whenTruncated"
        tooltipShowDelay={500}
        getRowClass={(p) => (p.data?.sku === '__TOTAL_ROW__' ? 'total-row' : undefined)}
      />
    </div>
  )
}
