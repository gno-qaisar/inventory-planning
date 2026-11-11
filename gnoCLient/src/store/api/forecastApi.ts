import { baseApi } from './baseApi'
import type { ComputedSkuRow, ManualOverrides } from '@gno/shared'

export const forecastApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createSession: builder.mutation<
      { sessionId: string; rows: ComputedSkuRow[] },
      { salesSessionId: string; inventorySessionId: string }
    >({
      query: (body) => ({ url: '/forecast/session', method: 'POST', body }),
      invalidatesTags: ['Forecast'],
    }),
    getSession: builder.query<{ rows: ComputedSkuRow[] }, string>({
      query: (id) => `/forecast/${id}`,
      providesTags: ['Forecast'],
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
      // Returns recalculated rows immediately — apply via applyApiRows in the caller
    }),
    recalculate: builder.mutation<
      { rows: ComputedSkuRow[]; recalculatedAt: string },
      string
    >({
      query: (sessionId) => ({
        url: `/forecast/${sessionId}/recalculate`,
        method: 'POST',
      }),
      invalidatesTags: ['Forecast'],
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

