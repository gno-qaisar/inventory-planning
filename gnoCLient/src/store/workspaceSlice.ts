import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit'
import {
  buildSkuInputs,
  computeAllRows,
  emptyOverrides,
  stockTone,
  workspaceTotals,
  type ComputedSkuRow,
  type DataStatus,
  type InventoryRow,
  type ManualOverrides,
  type MonthIndex,
  type SalesRow,
  type SkuInputs,
  type WorkspaceView,
} from '@gno/shared'
import type { RootState } from './store'

export type EomHealthFilter = 'all' | 'red' | 'yellow' | 'green'

export interface WorkspaceState {
  sessionId: string | null
  dirtyFlag: boolean
  recalcDialogOpen: boolean
  uploadOpen: boolean
  validationFailed: boolean
  useApi: boolean
  apiRows: ComputedSkuRow[] | null
  skus: SkuInputs[]
  salesRows: SalesRow[]
  inventoryRows: InventoryRow[]
  view: WorkspaceView
  eomHealthFilter: EomHealthFilter
  search: string
  selectedSku: string | null
}

const hasSavedSession =
  typeof window !== 'undefined' && Boolean(localStorage.getItem('gno_active_session_id'))

export const initialWorkspaceState: WorkspaceState = {
  sessionId: null,
  dirtyFlag: false,
  recalcDialogOpen: false,
  uploadOpen: !hasSavedSession,
  validationFailed: false,
  useApi: false,
  apiRows: null,
  skus: [],
  salesRows: [],
  inventoryRows: [],
  view: 'products',
  eomHealthFilter: 'all',
  search: '',
  selectedSku: null,
}

export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: initialWorkspaceState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string | null>) => {
      state.sessionId = action.payload
    },
    setDirtyFlag: (state, action: PayloadAction<boolean>) => {
      state.dirtyFlag = action.payload
      if (action.payload) {
        state.recalcDialogOpen = true
      }
    },
    openRecalcDialog: (state) => {
      state.recalcDialogOpen = true
    },
    closeRecalcDialog: (state) => {
      state.recalcDialogOpen = false
    },
    setUseApi: (state, action: PayloadAction<boolean>) => {
      state.useApi = action.payload
    },
    applyApiRows: (state, action: PayloadAction<ComputedSkuRow[]>) => {
      state.apiRows = action.payload
      state.useApi = true
      state.dirtyFlag = false
      state.recalcDialogOpen = false
      state.uploadOpen = false
    },
    openUpload: (state) => {
      state.uploadOpen = true
    },
    closeUpload: (state) => {
      state.uploadOpen = false
    },
    setValidationFailed: (state, action: PayloadAction<boolean>) => {
      state.validationFailed = action.payload
    },
    setView: (state, action: PayloadAction<WorkspaceView>) => {
      state.view = action.payload
    },
    setEomHealthFilter: (state, action: PayloadAction<EomHealthFilter>) => {
      state.eomHealthFilter = action.payload
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload
    },
    selectSku: (state, action: PayloadAction<string | null>) => {
      state.selectedSku = action.payload
    },
    loadLocalWorkspace: (
      state,
      action: PayloadAction<{ sales: SalesRow[]; inventory: InventoryRow[] }>,
    ) => {
      state.salesRows = action.payload.sales
      state.inventoryRows = action.payload.inventory
      state.skus = buildSkuInputs(action.payload.sales, action.payload.inventory)
      state.apiRows = null
      state.useApi = false
      state.uploadOpen = false
      state.validationFailed = false
      state.view = 'products'
      state.search = ''
      state.selectedSku = null
    },
    patchLocalOverrides: (
      state,
      action: PayloadAction<{ sku: string; patch: Partial<ManualOverrides> }>,
    ) => {
      state.skus = state.skus.map((s) =>
        s.sku === action.payload.sku
          ? { ...s, overrides: { ...s.overrides, ...action.payload.patch } }
          : s,
      )
      if (state.useApi && state.apiRows) {
        state.apiRows = computeAllRows(state.skus)
      }
    },
    setMultipleMonth: (
      state,
      action: PayloadAction<{ sku: string; month: MonthIndex; value: number | null }>,
    ) => {
      state.skus = state.skus.map((s) => {
        if (s.sku !== action.payload.sku) return s
        const multiplesPerMonth = { ...(s.overrides?.multiplesPerMonth ?? {}) }
        if (action.payload.value === null) delete multiplesPerMonth[action.payload.month]
        else multiplesPerMonth[action.payload.month] = action.payload.value
        return { ...s, overrides: { ...s.overrides, multiplesPerMonth } }
      })
      if (state.useApi && state.apiRows) {
        state.apiRows = computeAllRows(state.skus)
      }
    },
    setOrderMonth: (
      state,
      action: PayloadAction<{ sku: string; month: MonthIndex; value: number | null }>,
    ) => {
      state.skus = state.skus.map((s) => {
        if (s.sku !== action.payload.sku) return s
        const ordersByMonth = { ...(s.overrides?.ordersByMonth ?? {}) }
        if (action.payload.value === null || action.payload.value === 0) {
          delete ordersByMonth[action.payload.month]
        } else {
          ordersByMonth[action.payload.month] = action.payload.value
        }
        return { ...s, overrides: { ...s.overrides, ordersByMonth } }
      })
      if (state.useApi && state.apiRows) {
        state.apiRows = computeAllRows(state.skus)
      }
    },
    resetLocalOverrides: (state) => {
      state.skus = state.skus.map((s) => ({ ...s, overrides: emptyOverrides() }))
      if (state.useApi && state.apiRows) {
        state.apiRows = computeAllRows(state.skus)
      }
    },
  },
})

export const {
  setSessionId,
  setDirtyFlag,
  openRecalcDialog,
  closeRecalcDialog,
  setUseApi,
  applyApiRows,
  openUpload,
  closeUpload,
  setValidationFailed,
  setView,
  setEomHealthFilter,
  setSearch,
  selectSku,
  loadLocalWorkspace,
  patchLocalOverrides,
  setMultipleMonth,
  setOrderMonth,
  resetLocalOverrides,
} = workspaceSlice.actions

export const selectWorkspace = (state: RootState) => state.workspace

export const selectRows = createSelector([selectWorkspace], (w) => {
  if (w.useApi && w.apiRows && w.apiRows.length > 0) {
    return w.apiRows
  }
  return computeAllRows(w.skus)
})

function matchesSearch(row: ComputedSkuRow, search: string): boolean {
  if (!search.trim()) return true
  const q = search.trim().toLowerCase()
  return (
    row.sku.toLowerCase().includes(q) ||
    row.asin.toLowerCase().includes(q) ||
    row.title.toLowerCase().includes(q)
  )
}

function getWorstTone(row: ComputedSkuRow): 'red' | 'yellow' | 'green' {
  const tones = row.eom.map((v) => stockTone(v, row.avgForecastExclZero, row.bufferMonths))
  if (tones.some((t) => t === 'red')) return 'red'
  if (tones.some((t) => t === 'yellow')) return 'yellow'
  return 'green'
}

export const selectVisibleRows = createSelector([selectRows, selectWorkspace], (rows, w) => {
  let filtered = rows
  if (w.eomHealthFilter !== 'all') {
    filtered = filtered.filter((r) => getWorstTone(r) === w.eomHealthFilter)
  }
  if (w.search.trim()) {
    filtered = filtered.filter((r) => matchesSearch(r, w.search))
  }
  return filtered
})

export const selectTotals = createSelector([selectRows], (rows) => workspaceTotals(rows))

export const selectLoaded = createSelector(
  [selectWorkspace, selectRows],
  (w, rows) => Boolean((w.sessionId && rows.length > 0) || w.skus.length > 0),
)

export const selectDataStatus = createSelector(
  [selectLoaded, selectWorkspace, selectRows],
  (loaded, w, rows): DataStatus => {
    if (w.validationFailed) return { kind: 'failed' }
    if (loaded && rows.length > 0) return { kind: 'ready', skuCount: rows.length }
    return { kind: 'empty' }
  },
)

export default workspaceSlice.reducer
