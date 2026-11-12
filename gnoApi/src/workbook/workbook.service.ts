import { Injectable, BadRequestException } from '@nestjs/common'
import * as XLSX from 'xlsx'
import {
  computeSkuRow,
  type MonthIndex,
  type SkuInputs,
} from '@gno/shared'

export interface VerificationCheck {
  field: string
  monthIndex: number
  expected: number
  actual: number
  passed: boolean
}

export interface VerificationDiscrepancy {
  field: string
  monthIndex: number
  expected: number
  actual: number
  diff: number
}

export interface VerificationReport {
  asin: string
  passed: boolean
  checks: VerificationCheck[]
  discrepancies: VerificationDiscrepancy[]
}

@Injectable()
export class WorkbookService {
  verifyWorkbook(
    buffer: Buffer,
    targetAsin = 'B0F2SN5SL9',
    anchorDate: Date = new Date(2026, 8, 1),
  ): VerificationReport {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Empty buffer provided')
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets['ASIN View']
    if (!sheet) {
      throw new BadRequestException("Sheet 'ASIN View' not found in workbook")
    }

    const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })

    // Find row with target ASIN
    let asinRowIndex = -1
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as unknown[]
      if (Array.isArray(row) && row.some((cell) => String(cell).trim() === targetAsin)) {
        asinRowIndex = i
        break
      }
    }

    if (asinRowIndex === -1) {
      throw new BadRequestException(`ASIN ${targetAsin} not found in 'ASIN View' sheet`)
    }

    // Locate the block of rows around asinRowIndex
    const blockStart = Math.max(0, asinRowIndex - 1)
    const blockEnd = Math.min(rawData.length, asinRowIndex + 12)

    let startingStock = 0
    const historyUnits: number[] = []
    const sheetForecast: number[] = []
    const sheetEom: number[] = []
    const multiples: number[] = []
    let leadTimeDays = 90

    for (let r = blockStart; r < blockEnd; r++) {
      const row = (rawData[r] as unknown[]) || []
      const label = String(row[0] ?? '').trim().toLowerCase()

      if (label.includes('inventory starting')) {
        startingStock = Number(row[1]) || 0
      } else if (label.includes('units sold last year')) {
        for (let m = 1; m <= 8; m++) {
          historyUnits.push(Number(row[m]) || 0)
        }
      } else if (label.includes('monthly forecast units sold')) {
        for (let m = 1; m <= 8; m++) {
          sheetForecast.push(Number(row[m]) || 0)
        }
      } else if (label.includes('inventory end of the month')) {
        for (let m = 1; m <= 8; m++) {
          sheetEom.push(Number(row[m]) || 0)
        }
      } else if (label === 'multiple') {
        for (let m = 1; m <= 8; m++) {
          multiples.push(Number(row[m]) || 1)
        }
      } else if (label.includes('production & lead time') || label.includes('lead time')) {
        leadTimeDays = Number(row[1]) || 90
      }
    }

    // Use passed anchor date (defaults to Sept 2026 so month 1 is Oct 2026 in worked-example sheet)
    const anchor = anchorDate

    // Build history units keyed by month
    // Oct 2025 -> 2025-10, ..., May 2026 -> 2026-05
    const monthKeys = [
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
    ]
    const historyUnitsByMonth: Record<string, number> = {}
    monthKeys.forEach((k, i) => {
      historyUnitsByMonth[k] = historyUnits[i] ?? 0
    })

    const multiplesPerMonth: Partial<Record<MonthIndex, number>> = {}
    for (let i = 1; i <= 8; i++) {
      multiplesPerMonth[i as MonthIndex] = multiples[i - 1] ?? 1
    }

    const skuInputs: SkuInputs = {
      sku: `${targetAsin}-SKU`,
      asin: targetAsin,
      parentAsin: 'PARENT',
      title: 'Worked Example ASIN',
      hasHistory: true,
      inInventory: true,
      historyAvgUnits: 1000,
      historySellingPrice: 20,
      historyUnitsByMonth,
      historyNetUnitsByMonth: {},
      startingStock,
      currentInbound: 0,
      inboundPipeline: 0,
      velocity: 0,
      overrides: {
        growthMultiple: 1,
        bufferMonths: 0, // In the sheet, manual replenishment formula matches buffer 0
        leadTimeDays,
        forecastByMonth: {},
        ordersByMonth: {},
        multiplesPerMonth,
      },
    }

    const computed = computeSkuRow(skuInputs, anchor)

    const checks: VerificationCheck[] = []
    const discrepancies: VerificationDiscrepancy[] = []
    const tolerance = 0.5

    for (let m = 1; m <= 8; m++) {
      const idx = m - 1

      // Verify Forecast
      const expForecast = sheetForecast[idx] ?? 0
      const actForecast = computed.forecast[idx] ?? 0
      const diffForecast = Math.abs(actForecast - expForecast)
      const passedForecast = diffForecast <= tolerance

      checks.push({
        field: 'forecast',
        monthIndex: m,
        expected: expForecast,
        actual: actForecast,
        passed: passedForecast,
      })
      if (!passedForecast) {
        discrepancies.push({
          field: 'forecast',
          monthIndex: m,
          expected: expForecast,
          actual: actForecast,
          diff: diffForecast,
        })
      }

      // Verify EOM
      const expEom = sheetEom[idx] ?? 0
      const actEom = computed.eom[idx] ?? 0
      const diffEom = Math.abs(actEom - expEom)
      const passedEom = diffEom <= tolerance

      checks.push({
        field: 'eom',
        monthIndex: m,
        expected: expEom,
        actual: actEom,
        passed: passedEom,
      })
      if (!passedEom) {
        discrepancies.push({
          field: 'eom',
          monthIndex: m,
          expected: expEom,
          actual: actEom,
          diff: diffEom,
        })
      }
    }

    return {
      asin: targetAsin,
      passed: discrepancies.length === 0,
      checks,
      discrepancies,
    }
  }
}

