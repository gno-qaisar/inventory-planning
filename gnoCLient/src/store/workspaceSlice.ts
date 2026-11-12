import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { WorkspaceView } from '@gno/shared'
import type { RootState } from './store'

export type EomHealthFilter = 'all' | 'red' | 'yellow' | 'green'

export interface WorkspaceState {
  sessionId: string | null
  dirtyFlag: boolean
  recalcDialogOpen: boolean
  uploadOpen: boolean
  validationFailed: boolean
  view: WorkspaceView
  eomHealthFilter: EomHealthFilter
  search: string
}

const savedSessionId =
  typeof window !== 'undefined' ? localStorage.getItem('gno_active_session_id') : null

export const initialWorkspaceState: WorkspaceState = {
  sessionId: savedSessionId,
  dirtyFlag: false,
  recalcDialogOpen: false,
  uploadOpen: !savedSessionId,
  validationFailed: false,
  view: 'products',
  eomHealthFilter: 'all',
  search: '',
}

export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: initialWorkspaceState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string | null>) => {
      state.sessionId = action.payload
      if (action.payload) {
        state.uploadOpen = false
        try {
          localStorage.setItem('gno_active_session_id', action.payload)
        } catch {
          // Ignore localStorage errors
        }
      } else {
        try {
          localStorage.removeItem('gno_active_session_id')
        } catch {
          // Ignore localStorage errors
        }
      }
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
  },
})

export const {
  setSessionId,
  setDirtyFlag,
  openRecalcDialog,
  closeRecalcDialog,
  openUpload,
  closeUpload,
  setValidationFailed,
  setView,
  setEomHealthFilter,
  setSearch,
} = workspaceSlice.actions

export const selectWorkspace = (state: RootState) => state.workspace
export const selectSessionId = (state: RootState) => state.workspace.sessionId
export const selectView = (state: RootState) => state.workspace.view
export const selectSearch = (state: RootState) => state.workspace.search
export const selectEomHealthFilter = (state: RootState) => state.workspace.eomHealthFilter

export default workspaceSlice.reducer
