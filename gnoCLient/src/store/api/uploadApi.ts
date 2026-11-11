import { baseApi } from './baseApi'
import type { SessionDto, UploadCsvResponse, UploadXlsxResponse } from '@gno/shared'

export const uploadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadCsv: builder.mutation<UploadCsvResponse, FormData>({
      query: (formData) => ({ url: '/upload/csv', method: 'POST', body: formData }),
      invalidatesTags: ['Session'],
    }),
    uploadXlsx: builder.mutation<UploadXlsxResponse, FormData>({
      query: (formData) => ({ url: '/upload/xlsx', method: 'POST', body: formData }),
      invalidatesTags: ['Session'],
    }),
    getUploadHistory: builder.query<SessionDto[], void>({
      query: () => '/upload/history',
      providesTags: ['Session'],
    }),
  }),
})

export const { useUploadCsvMutation, useUploadXlsxMutation, useGetUploadHistoryQuery } =
  uploadApi

