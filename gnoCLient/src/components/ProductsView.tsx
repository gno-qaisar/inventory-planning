import { useCallback, useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { CellValueChangedEvent } from 'ag-grid-community'
import type { ComputedSkuRow, ManualOverrides } from '@gno/shared'
import { gridTheme } from '../grid/theme'
import { defaultColDef, createOverrideFromCellChange } from '../grid/gridDefaults'
import { usePatchOverridesMutation } from '../store/api/forecastApi'
import { useForecastData } from '../store/useForecastData'
import { AdjustPlanModal } from './AdjustPlanModal'
import { buildProductsColumnDefs } from './productsColumnDefs'

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

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<ComputedSkuRow>) => {
      if (!event.data) return
      const patch = createOverrideFromCellChange(
        event.colDef.field,
        event.oldValue,
        event.newValue,
      )
      if (patch) {
        void handleOverride(event.data.sku, patch)
      }
    },
    [handleOverride],
  )

  const adjustRow = adjustSku ? visibleRows.find((r) => r.sku === adjustSku) ?? null : null

  const columnDefs = useMemo(
    () => buildProductsColumnDefs(setAdjustSku, handleOverride),
    [handleOverride],
  )

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
        suppressCellFocus={true}
        tooltipShowMode="whenTruncated"
        tooltipShowDelay={500}
        onCellValueChanged={onCellValueChanged}
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
