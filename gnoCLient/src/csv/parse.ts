import Papa from 'papaparse'
import type { ParsedCsvFile } from '@gno/shared'
import {
  detectCsvKind,
  missingRequiredHeaders,
  parseInventoryRows,
  parseSalesRows,
} from '@gno/shared'
import { fingerprintFile } from './fingerprint'

export async function parseCsvFile(file: File): Promise<ParsedCsvFile> {
  const fingerprint = await fingerprintFile(file)
  const text = await file.text()

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
      complete: (result) => {
        const headers = (result.meta.fields ?? []).filter(Boolean)
        const kind = detectCsvKind(headers)
        resolve({
          file,
          fingerprint,
          headers,
          kind,
          missingHeaders: missingRequiredHeaders(headers, kind),
          salesRows: kind === 'sales' ? parseSalesRows(result.data) : [],
          inventoryRows: kind === 'inventory' ? parseInventoryRows(result.data) : [],
        })
      },
      error: (error: Error) => reject(error),
    })
  })
}
