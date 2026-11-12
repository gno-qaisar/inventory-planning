import { baseApi } from './baseApi'
import type { ComputedSkuRow, ManualOverrides } from '@gno/shared'

export const forecastApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createSession: builder.mutation<
      { sessionId: string; rows: ComputedSkuRow[] },
      { salesSessionId: string; inventorySessionId: string }
    >({
      query: (body) => ({ url: '/forecast/session', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            forecastApi.util.upsertQueryData('getSession', data.sessionId, { rows: data.rows }),
          )
        } catch {
          // ignore
        }
      },
      invalidatesTags: ['Forecast'],
    }),
    getSession: builder.query<{ rows: ComputedSkuRow[] }, string>({
      query: (id) => `/forecast/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Forecast', id }],
    }),
    patchOverrides: builder.mutation<
      { rows: ComputedSkuRow[]; recalculatedAt: string },
      { sessionId: string; sku: string; patch: Partial<ManualOverrides> }
    >({
      query: ({ sessionId, ...body }) => ({
        url: `/forecast/${sessionId}/overrides`,
        method: 'PATCH',
        body,
      }),
      async onQueryStarted({ sessionId, sku, patch }, { dispatch, queryFulfilled }) {
        // Optimistic update of RTK Query cache
        const patchResult = dispatch(
          forecastApi.util.updateQueryData('getSession', sessionId, (draft) => {
            const rowIndex = draft.rows.findIndex((r) => r.sku === sku)
            if (rowIndex !== -1) {
              const current = draft.rows[rowIndex]
              if (patch.threePlInventory !== undefined) {
                current.threePlInventory = patch.threePlInventory
              }
              if (patch.inventoryInProduction !== undefined) {
                current.inventoryInProduction = patch.inventoryInProduction
              }
              if (patch.leadTimeDays !== undefined) {
                current.leadTimeDays = patch.leadTimeDays
              }
              if (patch.bufferMonths !== undefined) {
                current.bufferMonths = patch.bufferMonths
              }
              if (patch.multiplesPerMonth) {
                current.multiplesPerMonth = {
                  ...(current.multiplesPerMonth ?? {}),
                  ...patch.multiplesPerMonth,
                }
              }
              if (patch.ordersByMonth) {
                const orders = [...current.orders]
                for (const [mStr, qty] of Object.entries(patch.ordersByMonth)) {
                  const m = Number(mStr) - 1
                  if (m >= 0 && m < orders.length) {
                    orders[m] = qty ?? 0
                  }
                }
                current.orders = orders
              }
            }
          }),
        )

        try {
          const { data } = await queryFulfilled
          // Update cache with authoritative recalculation from server
          dispatch(
            forecastApi.util.updateQueryData('getSession', sessionId, (draft) => {
              draft.rows = data.rows
            }),
          )
        } catch {
          // Rollback on network or server error
          patchResult.undo()
        }
      },
    }),
    recalculate: builder.mutation<
      { rows: ComputedSkuRow[]; recalculatedAt: string },
      string
    >({
      query: (sessionId) => ({
        url: `/forecast/${sessionId}/recalculate`,
        method: 'POST',
      }),
      async onQueryStarted(sessionId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            forecastApi.util.updateQueryData('getSession', sessionId, (draft) => {
              draft.rows = data.rows
            }),
          )
        } catch {
          // ignore
        }
      },
    }),
  }),
})

export const {
  useCreateSessionMutation,
  useGetSessionQuery,
  useLazyGetSessionQuery,
  usePatchOverridesMutation,
  useRecalculateMutation,
} = forecastApi
