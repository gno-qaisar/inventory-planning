import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from './api/baseApi'
import workspaceReducer from './workspaceSlice'

export const store = configureStore({
  reducer: {
    workspace: workspaceReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (gmd) => gmd().concat(baseApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

