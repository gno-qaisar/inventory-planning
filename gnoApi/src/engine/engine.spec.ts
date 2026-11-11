import {
  computeSkuRow,
  forecastMonthKey,
  stockTone,
  type MonthIndex,
  type SkuInputs,
} from '@gno/shared'

describe('Forecasting Engine Unit Tests', () => {
  // 1. Normal case matching worked example (B0F2SN5SL9)
  it('1. matches worked example B0F2SN5SL9 forecast and EOM within +-0.5 tolerance', () => {
    const anchor = new Date(2026, 8, 1) // Sept 2026 -> Month 1 is Oct 2026

    const sku: SkuInputs = {
      sku: 'B0F2SN5SL9-SKU',
      asin: 'B0F2SN5SL9',
      parentAsin: 'PARENT',
      title: 'Worked Example ASIN',
      hasHistory: true,
      inInventory: true,
      historyAvgUnits: 1000,
      historySellingPrice: 20,
      historyUnitsByMonth: {
        '2025-10': 73,
        '2025-11': 3080,
        '2025-12': 2540,
        '2026-01': 805,
        '2026-02': 419,
        '2026-03': 488,
        '2026-04': 338,
        '2026-05': 396,
      },
      historyNetUnitsByMonth: {},
      startingStock: 17884,
      currentInbound: 0,
      inboundPipeline: 0,
      velocity: 2.43,
      overrides: {
        growthMultiple: 1,
        bufferMonths: 0,
        leadTimeDays: 95,
        forecastByMonth: {},
        ordersByMonth: {},
        multiplesPerMonth: {
          1: 1.05,
          2: 1.3,
          3: 1.75,
          4: 3.5,
          5: 3.5,
          6: 3.5,
          7: 3.5,
          8: 3.5,
        },
      },
    }

    const result = computeSkuRow(sku, anchor)

    const expectedForecast = [76.65, 4004, 4445, 2817.5, 1466.5, 1708, 1183, 1386]
    const expectedEom = [
      17807.35,
      13803.35,
      9358.35,
      6540.85,
      5074.35,
      3366.35,
      2183.35,
      797.35,
    ]

    for (let i = 0; i < 8; i++) {
      expect(Math.abs(result.forecast[i] - expectedForecast[i])).toBeLessThanOrEqual(0.5)
      expect(Math.abs(result.eom[i] - expectedEom[i])).toBeLessThanOrEqual(0.5)
    }
  })

  // 2. New ASIN with no history -> uses fallbackUnits
  it('2. uses fallbackUnits when ASIN has no sales history', () => {
    const sku: SkuInputs = {
      sku: 'NEW-ASIN-SKU',
      asin: 'B0NEW00001',
      parentAsin: 'PARENT',
      title: 'New Product',
      hasHistory: false,
      inInventory: true,
      historyAvgUnits: 0,
      historySellingPrice: 25,
      historyUnitsByMonth: {},
      historyNetUnitsByMonth: {},
      startingStock: 500,
      currentInbound: 0,
      inboundPipeline: 0,
      velocity: 0,
      overrides: {
        fallbackUnits: 150,
        forecastByMonth: {},
        ordersByMonth: {},
      },
    }

    const result = computeSkuRow(sku)

    expect(result.fallbackUnits).toBe(150)
    expect(result.needsManualInput).toBe(true)
    for (const f of result.forecast) {
      expect(f).toBe(150)
    }
  })

  // 3. Zero-forecast months excluded from avgForecastExclZero
  it('3. excludes zero-forecast months from avgForecastExclZero', () => {
    const sku: SkuInputs = {
      sku: 'ZERO-TEST-SKU',
      asin: 'B0ZEROTEST',
      parentAsin: 'PARENT',
      title: 'Zero Months Test',
      hasHistory: true,
      inInventory: true,
      historyAvgUnits: 100,
      historySellingPrice: 10,
      historyUnitsByMonth: {},
      historyNetUnitsByMonth: {},
      startingStock: 1000,
      currentInbound: 0,
      inboundPipeline: 0,
      velocity: 1,
      overrides: {
        forecastByMonth: {
          1: 100,
          2: 0,
          3: 200,
          4: 0,
          5: 300,
          6: 0,
          7: 0,
          8: 0,
        },
        ordersByMonth: {},
      },
    }

    const result = computeSkuRow(sku)

    // Non-zero months are [100, 200, 300]
    // Average should be (100 + 200 + 300) / 3 = 200
    expect(result.avgForecastExclZero).toBe(200)
  })

  // 4. Orders landing beyond month 8 are correctly excluded from the 8-month window
  it('4. excludes orders landing beyond the 8-month horizon from landing inventory', () => {
    // Lead time: 180 days -> landingOffset = 6 months
    const sku: SkuInputs = {
      sku: 'LEAD-TIME-SKU',
      asin: 'B0LEADTIME',
      parentAsin: 'PARENT',
      title: 'Long Lead Time Product',
      hasHistory: true,
      inInventory: true,
      historyAvgUnits: 50,
      historySellingPrice: 15,
      historyUnitsByMonth: {},
      historyNetUnitsByMonth: {},
      startingStock: 1000,
      currentInbound: 0,
      inboundPipeline: 0,
      velocity: 1,
      overrides: {
        leadTimeDays: 180, // landing offset = 6
        bufferMonths: 0, // avoid auto-orders
        forecastByMonth: {
          1: 10,
          2: 10,
          3: 10,
          4: 10,
          5: 10,
          6: 10,
          7: 10,
          8: 10,
        },
        ordersByMonth: {
          1: 100, // lands at month index 0 + 6 = 6 (Month 7) -> included!
          4: 500, // lands at month index 3 + 6 = 9 > 8 -> EXCLUDED!
          8: 1000, // lands at month index 7 + 6 = 13 > 8 -> EXCLUDED!
        },
      },
    }

    const result = computeSkuRow(sku)

    expect(result.landingOffset).toBe(6)

    // Month 1 to 6 EOM: 1000 - 10*monthIndex
    // Month 1: 1000 - 10 = 990
    expect(result.eom[0]).toBe(990)
    // Month 6: 1000 - 60 = 940
    expect(result.eom[5]).toBe(940)
    // Month 7: Month 1's 100 units land: 940 + 100 - 10 = 1030
    expect(result.eom[6]).toBe(1030)
    // Month 8: 1030 - 10 = 1020 (Month 4's 500 units did NOT land in month 8)
    expect(result.eom[7]).toBe(1020)
  })

  // 5. Green/yellow/red status thresholds
  it('5. determines correct green/yellow/red status tone according to thresholds', () => {
    const avgForecast = 100
    const bufferMonths = 2
    // Threshold = 0.25 * 100 * 2 = 50

    // Red: eom <= 0
    expect(stockTone(0, avgForecast, bufferMonths)).toBe('red')
    expect(stockTone(-15, avgForecast, bufferMonths)).toBe('red')

    // Yellow: 0 < eom <= threshold (<= 50)
    expect(stockTone(25, avgForecast, bufferMonths)).toBe('yellow')
    expect(stockTone(50, avgForecast, bufferMonths)).toBe('yellow')

    // Green: eom > threshold (> 50)
    expect(stockTone(51, avgForecast, bufferMonths)).toBe('green')
    expect(stockTone(200, avgForecast, bufferMonths)).toBe('green')
  })

  // 6. Per-month multiple overrides
  it('6. applies per-month multiple overrides correctly, falling back to global multiple', () => {
    const anchor = new Date(2026, 8, 1)

    // Build history for prior year months
    const historyUnitsByMonth: Record<string, number> = {}
    for (let m = 1; m <= 8; m++) {
      const key = forecastMonthKey(m as MonthIndex, anchor)!
      historyUnitsByMonth[key] = 100
    }

    const sku: SkuInputs = {
      sku: 'MULTIPLE-TEST-SKU',
      asin: 'B0MULTITEST',
      parentAsin: 'PARENT',
      title: 'Multiple Per Month Test',
      hasHistory: true,
      inInventory: true,
      historyAvgUnits: 100,
      historySellingPrice: 10,
      historyUnitsByMonth,
      historyNetUnitsByMonth: {},
      startingStock: 1000,
      currentInbound: 0,
      inboundPipeline: 0,
      velocity: 1,
      overrides: {
        growthMultiple: 1.5,
        forecastByMonth: {},
        ordersByMonth: {},
        multiplesPerMonth: {
          2: 2.0, // Month 2 override
          5: 3.0, // Month 5 override
        },
      },
    }

    const result = computeSkuRow(sku, anchor)

    // Month 1: global multiple 1.5 * 100 = 150
    expect(result.forecast[0]).toBe(150)
    // Month 2: per-month multiple 2.0 * 100 = 200
    expect(result.forecast[1]).toBe(200)
    // Month 3: global multiple 1.5 * 100 = 150
    expect(result.forecast[2]).toBe(150)
    // Month 4: global multiple 1.5 * 100 = 150
    expect(result.forecast[3]).toBe(150)
    // Month 5: per-month multiple 3.0 * 100 = 300
    expect(result.forecast[4]).toBe(300)
    // Month 6: global multiple 1.5 * 100 = 150
    expect(result.forecast[5]).toBe(150)

    expect(result.isEdited).toBe(true)
  })
})

