import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
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
  private readonly logger = new Logger(UploadService.name)

  constructor(
    private readonly dataSource: DataSource,
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

      // Transactional delete and chunked save
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(RawSale, { sessionId: session!.id })
        await manager.save(RawSale, rawSales, { chunk: 500 })
        session!.salesFileName = file.originalname
        await manager.save(Session, session!)
      })

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

      // Transactional delete and chunked save
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(RawInventory, { sessionId: session!.id })
        await manager.save(RawInventory, rawInvs, { chunk: 500 })
        session!.inventoryFileName = file.originalname
        session!.skuCount = rowCount
        await manager.save(Session, session!)
      })

      await this.historyService.logEvent(session.id, 'upload_inventory_csv', {
        fileName: file.originalname,
        rowCount,
        issues,
      })
    }

    this.logger.log(`Processed ${kind} upload for session ${session.id}: ${rowCount} rows`)

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
      throw new BadRequestException('No workbook file provided')
    }

    const sessionId = requestedSessionId || uuidv4()
    let session = await this.sessionRepo.findOne({ where: { id: sessionId } })
    if (!session) {
      session = this.sessionRepo.create({ id: sessionId, skuCount: 0 })
      await this.sessionRepo.save(session)
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheetNames = workbook.SheetNames
    const summaries: Record<string, number> = {}

    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name]
      const json = XLSX.utils.sheet_to_json(sheet)
      summaries[name] = json.length
    }

    session.inventoryFileName = file.originalname
    await this.sessionRepo.save(session)

    await this.historyService.logEvent(sessionId, 'upload_workbook', {
      fileName: file.originalname,
      sheets: sheetNames,
      summaries,
    })

    return {
      sessionId,
      sheets: sheetNames,
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
