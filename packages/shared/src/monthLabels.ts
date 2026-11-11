import { HORIZON_MONTHS } from './types'

const MONTH_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' })

// Default anchor is Oct 2026 (Month 0 of the Panda Planner dataset)
// Month 1 to 8 will be Nov 26, Dec 26, Jan 27, Feb 27, Mar 27, Apr 27, May 27, Jun 27
export function buildMonthLabels(anchor = new Date(2026, 9, 1)): string[] {
  const labels: string[] = []
  for (let i = 0; i <= HORIZON_MONTHS; i += 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1)
    labels.push(MONTH_FMT.format(d))
  }
  return labels
}

export function monthHeader(index: number, labels: string[]): string {
  const label = labels[index] ?? `M${index}`
  return label
}

