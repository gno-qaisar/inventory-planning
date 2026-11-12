import { useEffect, useState } from 'react'
import type { ICellRendererParams } from 'ag-grid-community'
import type { ComputedSkuRow, ManualOverrides } from '@gno/shared'
import { formatInt } from '../../domain/format'

export interface EditInputCellProps extends ICellRendererParams<ComputedSkuRow> {
  field: 'threePlInventory' | 'inventoryInProduction'
  onSave?: (sku: string, patch: Partial<ManualOverrides>) => void
}

export function EditInputCell({ data, field, onSave }: EditInputCellProps) {
  if (!data) return null

  if (data.sku === 'TOTAL' || data.sku === '__TOTAL_ROW__') {
    const totalVal =
      field === 'threePlInventory' ? data.threePlInventory ?? 0 : data.inventoryInProduction ?? 0
    return <span>{formatInt(totalVal)}</span>
  }

  const initial =
    field === 'threePlInventory' ? data.threePlInventory ?? 0 : data.inventoryInProduction ?? 0
  const [val, setVal] = useState(String(initial))

  useEffect(() => {
    setVal(String(initial))
  }, [initial])

  const commitChange = () => {
    const num = Math.max(0, Math.round(Number(val) || 0))
    setVal(String(num))
    if (num !== initial && onSave) {
      onSave(data.sku, { [field]: num })
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className="edit-input"
      value={val}
      aria-label={`${field === 'threePlInventory' ? '3PL' : 'In production'} for ${data.title || data.sku}`}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commitChange}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          commitChange()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setVal(String(initial))
          e.currentTarget.blur()
        }
      }}
    />
  )
}
