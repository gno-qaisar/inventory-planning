import type { ICellRendererParams } from 'ag-grid-community'
import type { ComputedSkuRow } from '@gno/shared'

export function TitleCell({ data }: ICellRendererParams<ComputedSkuRow>) {
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
