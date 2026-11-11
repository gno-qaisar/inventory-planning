import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  detectCsvKind,
  missingRequiredHeaders,
  parseInventoryRows,
  parseSalesRows,
  type CsvKind,
} from '@gno/shared'
import { Session } from '../db/entities/session.entity'
import { RawSale } from '../db/entities/raw-sales.entity'
import { RawInventory } from '../db/entities/raw-inventory.entity'
import { HistoryService } from '../history/history.service'

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(RawSale)
    private readonly rawSaleRepo: Repository<RawSale>,
    @InjectRepository(RawInventory)
    private readonly rawInventoryRepo: Repository<RawInventory>,
    private readonly historyService: HistoryService,
  ) {}

  async handleCsvUpload(file: Express.Multer.File, requestedSessionId?: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided')
    }

    const csvText = file.buffer.toString('utf-8')
    const parsed = Papa.parse<Record<string, unknown>>(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
    })

    const headers = (parsed.meta.fields ?? []).filter(Boolean)
    const kind: CsvKind = detectCsvKind(headers)
    const issues = missingRequiredHeaders(headers, kind)

    let session: Session | null = null
    if (requestedSessionId) {
      session = await this.sessionRepo.findOne({ where: { id: requestedSessionId } })
    }
    if (!session) {
      session = this.sessionRepo.create({
        id: requestedSessionId || uuidv4(),
        skuCount: 0,
      })
      session = await this.sessionRepo.save(session)
    }

    let rowCount = 0

    if (kind === 'sales') {
      const salesRows = parseSalesRows(parsed.data)
      rowCount = salesRows.length
      const rawSales = salesRows.map((r) =>
        this.rawSaleRepo.create({
          sessionId: session!.id,
          month: r.month,
          asin: r.asin,
          sku: r.sku,
          parentAsin: r.parentAsin,
          unitsOrdered: r.unitsOrdered,
          orderedProductSales: r.orderedProductSales,
          netUnitsSold: r.netUnitsSold,
          netProductSales: r.netProductSales,
          currency: r.currency || 'USD',
        }),
      )

      // Clear previous sales for this session if re-uploading
      await this.rawSaleRepo.delete({ sessionId: session.id })
      await this.rawSaleRepo.save(rawSales, { chunk: 500 })

      session.salesFileName = file.originalname
      await this.sessionRepo.save(session)

      await this.historyService.logEvent(session.id, 'upload_sales_csv', {
        fileName: file.originalname,
        rowCount,
        issues,
      })
    } else if (kind === 'inventory') {
      const invRows = parseInventoryRows(parsed.data)
      rowCount = invRows.length
      const rawInvs = invRows.map((r) =>
        this.rawInventoryRepo.create({
          sessionId: session!.id,
          marketplace: r.marketplace,
          asin: r.asin,
          sku: r.sku,
          title: r.title,
          velocity: r.velocity,
          fbaActive: r.fbaActive,
          fbaReserved: r.fbaReserved,
          fbaInbound: r.fbaInbound,
          awdTotal: r.awdTotal,
          warehouse: r.warehouse,
          fbaFull: r.fbaFull,
        }),
      )

      await this.rawInventoryRepo.delete({ sessionId: session.id })
      await this.rawInventoryRepo.save(rawInvs, { chunk: 500 })

      session.inventoryFileName = file.originalname
      session.skuCount = rowCount
      await this.sessionRepo.save(session)

      await this.historyService.logEvent(session.id, 'upload_inventory_csv', {
        fileName: file.originalname,
        rowCount,
        issues,
      })
    } else {
      await this.historyService.logEvent(session.id, 'upload_unknown_csv', {
        fileName: file.originalname,
        headers,
      })
    }

    return {
      sessionId: session.id,
      kind,
      rowCount,
      headers,
      issues,
    }
  }

  async handleXlsxUpload(file: Express.Multer.File, requestedSessionId?: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided')
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheets = workbook.SheetNames

    let session: Session | null = null
    if (requestedSessionId) {
      session = await this.sessionRepo.findOne({ where: { id: requestedSessionId } })
    }
    if (!session) {
      session = this.sessionRepo.create({
        id: requestedSessionId || uuidv4(),
        skuCount: 0,
      })
    }
    session.xlsxFileName = file.originalname
    session = await this.sessionRepo.save(session)

    const summaries: Record<string, { rowCount: number; headers: string[] }> = {}
    for (const sheetName of ['ASIN View', 'Annual plan', 'SellerBoard data', 'Sellerboard Inventory']) {
      if (workbook.Sheets[sheetName]) {
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
          header: 1,
        })
        const headers = Array.isArray(json[0]) ? (json[0] as unknown[]).map(String) : []
        summaries[sheetName] = {
          rowCount: Math.max(0, json.length - 1),
          headers,
        }
      }
    }

    await this.historyService.logEvent(session.id, 'upload_xlsx', {
      fileName: file.originalname,
      sheets,
      summaries,
    })

    return {
      sessionId: session.id,
      sheets,
      summaries,
    }
  }

  async getSessions(limit = 50, offset = 0): Promise<Session[]> {
    return this.sessionRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    })
  }
}

