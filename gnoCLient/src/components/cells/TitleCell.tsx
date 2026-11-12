import type { ICellRendererParams } from 'ag-grid-community'
import type { ComputedSkuRow } from '@gno/shared'

export function TitleCell({ data }: ICellRendererParams<ComputedSkuRow>) {
  if (!data) return null
  const titleText = data.title || data.sku || ''
  return (
    <span
      className="title-cell prodname"
      title={titleText}
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}
    >
      {titleText}
    </span>
  )
}

