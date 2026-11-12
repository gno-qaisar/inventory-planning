import type { ICellRendererParams } from 'ag-grid-community'
import type { ComputedSkuRow } from '@gno/shared'

export interface AdjustBtnCellProps extends ICellRendererParams<ComputedSkuRow> {
  onOpen: (sku: string) => void
}

export function AdjustBtnCell({ data, onOpen }: AdjustBtnCellProps) {
  if (!data || data.sku === 'TOTAL' || data.sku === '__TOTAL_ROW__') return null
  return (
    <button
      type="button"
      className="btn sm"
      onClick={() => onOpen(data.sku)}
      aria-label={`Adjust plan for ${data.title || data.sku}`}
    >
      ☰ Adjust plan
    </button>
  )
}
