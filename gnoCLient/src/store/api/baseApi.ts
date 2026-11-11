import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const baseUrl =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
  'http://localhost:3000/api'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl }),
  tagTypes: ['Session', 'Forecast', 'History'],
  endpoints: () => ({}),
})

