import * as fs from 'fs'
import * as path from 'path'
import { WorkbookService } from './workbook.service'

describe('WorkbookService', () => {
  let service: WorkbookService

  beforeEach(() => {
    service = new WorkbookService()
  })

  it('verifies worked example ASIN B0F2SN5SL9 successfully against real workbook', () => {
    const filePath = path.resolve(
      __dirname,
      '../../../panda-planner-forecast-pkg/Inventory Planning.xlsx',
    )
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filePath} not found, skipping`)
      return
    }

    const buffer = fs.readFileSync(filePath)
    const report = service.verifyWorkbook(buffer, 'B0F2SN5SL9')

    expect(report.asin).toBe('B0F2SN5SL9')
    expect(report.passed).toBe(true)
    expect(report.discrepancies).toHaveLength(0)
    expect(report.checks.length).toBe(16) // 8 forecast + 8 eom
    expect(report.checks.every((c) => c.passed)).toBe(true)
  })
})

