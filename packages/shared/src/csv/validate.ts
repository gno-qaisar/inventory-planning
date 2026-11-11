import type { FileFingerprint, JoinSummary, ParsedCsvFile, UploadValidation, ValidationIssue } from '../types'
import { summarizeJoin } from '../join'

export function isIdenticalFile(a?: FileFingerprint | null, b?: FileFingerprint | null): boolean {
  if (!a || !b) return false
  return a.name === b.name && a.size === b.size && a.hash === b.hash
}

export function validateUploadPair(
  salesSlot: ParsedCsvFile | null,
  inventorySlot: ParsedCsvFile | null,
): UploadValidation {
  const issues: ValidationIssue[] = []

  if (!salesSlot || !inventorySlot) {
    return { issues, canLoad: false, summary: null }
  }

  if (isIdenticalFile(salesSlot.fingerprint, inventorySlot.fingerprint)) {
    issues.push({
      code: 'duplicate',
      message:
        'Duplicate File: Both slots contain the exact same file. Upload one Sales History CSV and one Current Inventory CSV.',
    })
    return { issues, canLoad: false, summary: null }
  }

  if (salesSlot.kind === 'inventory' && inventorySlot.kind === 'sales') {
    issues.push({
      code: 'swapped',
      message: 'Swapped Files Detected: Inventory file is in the Sales slot.',
    })
    return { issues, canLoad: false, summary: null }
  }

  if (salesSlot.kind !== 'unknown' && salesSlot.kind === inventorySlot.kind) {
    const typeLabel = salesSlot.kind === 'sales' ? 'Sales' : 'Inventory'
    issues.push({
      code: 'same_schema',
      message: `Schema Conflict: Both files are of the same type (${typeLabel}). Provide one Sales CSV and one Inventory CSV.`,
    })
    return { issues, canLoad: false, summary: null }
  }

  const missing: string[] = []
  if (salesSlot.kind !== 'sales') {
    missing.push('Slot 1 is not a Sales History CSV')
  } else {
    salesSlot.missingHeaders.forEach((col) => missing.push(`Sales: ${col}`))
  }
  if (inventorySlot.kind !== 'inventory') {
    missing.push('Slot 2 is not a Current Inventory CSV')
  } else {
    inventorySlot.missingHeaders.forEach((col) => missing.push(`Inventory: ${col}`))
  }

  if (missing.length > 0) {
    issues.push({
      code: 'missing_columns',
      message: 'Missing required columns.',
      details: missing,
    })
    return { issues, canLoad: false, summary: null }
  }

  const summary: JoinSummary = summarizeJoin(salesSlot.salesRows, inventorySlot.inventoryRows)
  return { issues, canLoad: true, summary }
}

