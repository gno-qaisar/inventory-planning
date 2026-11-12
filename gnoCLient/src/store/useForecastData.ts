import { useMemo } from 'react'
import { stockTone, workspaceTotals, type ComputedSkuRow } from '@gno/shared'
import { useAppSelector } from './hooks'
import { selectEomHealthFilter, selectSearch, selectSessionId } from './workspaceSlice'
import { useGetSessionQuery } from './api/forecastApi'

export function getWorstTone(row: ComputedSkuRow): 'red' | 'yellow' | 'green' {
  if (!row?.eom || row.eom.length === 0) return 'green'
  const tones = row.eom.map((v) => stockTone(v, row.avgForecastExclZero, row.bufferMonths))
  if (tones.some((t) => t === 'red')) return 'red'
  if (tones.some((t) => t === 'yellow')) return 'yellow'
  return 'green'
}

export function matchesSearch(row: ComputedSkuRow, search: string): boolean {
  if (!search.trim()) return true
  const q = search.trim().toLowerCase()
  return (
    (row.sku || '').toLowerCase().includes(q) ||
    (row.asin || '').toLowerCase().includes(q) ||
    (row.title || '').toLowerCase().includes(q)
  )
}

export function useForecastData() {
  const sessionId = useAppSelector(selectSessionId)
  const search = useAppSelector(selectSearch)
  const filter = useAppSelector(selectEomHealthFilter)

  const { data, isLoading, isFetching, error, refetch } = useGetSessionQuery(sessionId ?? '', {
    skip: !sessionId,
  })

  const rawRows = useMemo(() => data?.rows ?? [], [data?.rows])

  const visibleRows = useMemo(() => {
    let list = rawRows
    if (filter !== 'all') {
      list = list.filter((r) => getWorstTone(r) === filter)
    }
    if (search.trim()) {
      list = list.filter((r) => matchesSearch(r, search))
    }
    return list
  }, [rawRows, filter, search])

  const totals = useMemo(() => workspaceTotals(rawRows), [rawRows])

  const loaded = Boolean(sessionId && rawRows.length > 0)

  return {
    sessionId,
    rawRows,
    visibleRows,
    totals,
    loaded,
    isLoading,
    isFetching,
    error,
    refetch,
  }
}

