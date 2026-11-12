import type { ColDef } from 'ag-grid-community'
import { getWorstHealth, type ComputedSkuRow, type ManualOverrides } from '@gno/shared'
import { formatInt, formatUsd } from '../domain/format'
import { centerStyle } from '../grid/gridDefaults'
import { TitleCell } from './cells/TitleCell'
import { AdjustBtnCell } from './cells/AdjustBtnCell'
import { StatusCell } from './cells/StatusCell'
import { OutlookCell } from './OutlookCell'
import { EditInputCell } from './cells/EditInputCell'

export function buildProductsColumnDefs(
  onOpenAdjust: (sku: string) => void,
  onSaveOverride?: (sku: string, patch: Partial<ManualOverrides>) => void,
): ColDef<ComputedSkuRow>[] {
  return [
    {
      headerName: 'Product',
      field: 'title',
      colId: 'title',
      pinned: 'left',
      width: 240,
      minWidth: 200,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: TitleCell,
    },
    {
      headerName: 'Adjust',
      colId: 'adjust',
      pinned: 'left',
      width: 115,
      minWidth: 110,
      sortable: false,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: AdjustBtnCell,
      cellRendererParams: { onOpen: onOpenAdjust },
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
      valueFormatter: ({ value }) => formatInt(Number(value) || 0),
    },
    {
      headerName: '3PL',
      field: 'threePlInventory',
      colId: 'threePl',
      width: 95,
      minWidth: 85,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: EditInputCell,
      cellRendererParams: {
        field: 'threePlInventory',
        onSave: onSaveOverride,
      },
    },
    {
      headerName: 'In production',
      field: 'inventoryInProduction',
      colId: 'inProd',
      width: 105,
      minWidth: 95,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      cellRenderer: EditInputCell,
      cellRendererParams: {
        field: 'inventoryInProduction',
        onSave: onSaveOverride,
      },
    },
    {
      headerName: 'Forecast units',
      colId: 'forecastTotal',
      width: 110,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      valueGetter: ({ data }) => (data ? Math.round(data.forecast.reduce((s, v) => s + v, 0)) : 0),
      valueFormatter: ({ value }) => formatInt(Number(value) || 0),
    },
    {
      headerName: 'Forecast revenue',
      colId: 'forecastRevenue',
      width: 120,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      valueGetter: ({ data }) => data?.totalSales ?? 0,
      valueFormatter: ({ value }) => formatUsd(Number(value) || 0),
    },
    {
      headerName: 'First risk',
      colId: 'firstRisk',
      width: 90,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      valueGetter: ({ data }) => data?.firstRiskMonthName ?? '—',
    },
    {
      headerName: 'Order by',
      colId: 'orderBy',
      width: 90,
      headerClass: 'text-center',
      cellClass: 'text-center',
      cellStyle: centerStyle,
      valueGetter: ({ data }) => data?.orderBy ?? '—',
      cellRenderer: ({ value }: { value: string }) => {
        if (value === 'Now') {
          return <strong style={{ color: 'var(--red-600)' }}>Now</strong>
        }
        return <span>{value || '—'}</span>
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
    },
  ]
}
