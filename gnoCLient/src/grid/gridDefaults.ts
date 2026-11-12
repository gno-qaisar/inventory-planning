import type { CellStyle, ColDef } from 'ag-grid-community'
import type { ManualOverrides } from '@gno/shared'

export const centerStyle: CellStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  overflow: 'hidden',
  minWidth: 0,
}

export const defaultColDef: ColDef = {
  resizable: true,
  sortable: true,
  suppressHeaderMenuButton: true,
  wrapHeaderText: true,
  autoHeaderHeight: false,
  headerClass: 'text-center',
  cellClass: 'text-center',
  cellStyle: centerStyle,
}

const EDITABLE_FIELDS = ['threePlInventory', 'inventoryInProduction'] as const
type EditableField = (typeof EDITABLE_FIELDS)[number]

export function isEditableField(field?: string): field is EditableField {
  return field !== undefined && (EDITABLE_FIELDS as readonly string[]).includes(field)
}

export function createOverrideFromCellChange(
  field: string | undefined,
  oldValue: unknown,
  newValue: unknown,
): Partial<ManualOverrides> | null {
  if (!isEditableField(field)) {
    return null
  }

  const cleanNew = Math.max(0, Math.round(Number(newValue) || 0))
  const cleanOld = Math.max(0, Math.round(Number(oldValue) || 0))

  if (cleanNew === cleanOld) {
    return null
  }

  return { [field]: cleanNew }
}
