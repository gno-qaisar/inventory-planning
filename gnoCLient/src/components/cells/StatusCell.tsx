import type { ICellRendererParams } from 'ag-grid-community'
import { getWorstHealth, HEALTH_LABEL, type ComputedSkuRow } from '@gno/shared'

export function StatusCell({ data }: ICellRendererParams<ComputedSkuRow>) {
  if (!data) return null
  const h = getWorstHealth(data)
  return (
    <span className={`status ${h}`}>
      <span className="dot" />
      <span>{HEALTH_LABEL[h]}</span>
    </span>
  )
}
