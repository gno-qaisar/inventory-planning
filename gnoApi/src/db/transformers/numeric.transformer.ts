import type { ValueTransformer } from 'typeorm'

export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null => {
    if (value === null || value === undefined || isNaN(value)) return null
    return value
  },
  from: (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined) return null
    const parsed = typeof value === 'number' ? value : parseFloat(value)
    return isNaN(parsed) ? null : parsed
  },
}

