import { useEffect, useMemo, useState } from 'react'
import { parseCsvFile } from '../csv/parse'
import { validateUploadPair } from '@gno/shared'
import type { ParsedCsvFile } from '@gno/shared'
import { DropZone } from './DropZone'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  useUploadCsvMutation,
  useUploadXlsxMutation,
} from '../store/api/uploadApi'
import { useCreateSessionMutation } from '../store/api/forecastApi'
import {
  applyApiRows,
  closeUpload,
  loadLocalWorkspace,
  setSessionId,
  setUseApi,
  setValidationFailed,
} from '../store/workspaceSlice'

export function UploadModal() {
  const uploadOpen = useAppSelector((s) => s.workspace.uploadOpen)
  const dispatch = useAppDispatch()

  const [sales, setSales] = useState<ParsedCsvFile | null>(null)
  const [inventory, setInventory] = useState<ParsedCsvFile | null>(null)
  const [xlsxFile, setXlsxFile] = useState<File | null>(null)
  const [xlsxStatus, setXlsxStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const [uploadCsv, { isLoading: isUploadingCsv }] = useUploadCsvMutation()
  const [uploadXlsx, { isLoading: isUploadingXlsx }] = useUploadXlsxMutation()
  const [createSession, { isLoading: isCreatingSession }] = useCreateSessionMutation()

  useEffect(() => {
    if (!uploadOpen) return
    setSales(null)
    setInventory(null)
    setXlsxFile(null)
    setXlsxStatus(null)
    setParseError(null)
  }, [uploadOpen])

  const validation = useMemo(() => validateUploadPair(sales, inventory), [sales, inventory])

  useEffect(() => {
    if (validation.issues.length > 0) {
      dispatch(setValidationFailed(true))
    }
  }, [validation.issues, dispatch])

  if (!uploadOpen) return null

  const duplicate = validation.issues.some((i) => i.code === 'duplicate')
  const swapped = validation.issues.find((i) => i.code === 'swapped')
  const sameSchema = validation.issues.find((i) => i.code === 'same_schema')
  const missing = validation.issues.find((i) => i.code === 'missing_columns')

  const assign = async (slot: 'sales' | 'inventory', file: File) => {
    setBusy(true)
    setParseError(null)
    try {
      const parsed = await parseCsvFile(file)
      if (slot === 'sales') setSales(parsed)
      else setInventory(parsed)
    } catch {
      setParseError('Could not parse CSV. Check encoding and try again.')
      dispatch(setValidationFailed(true))
    } finally {
      setBusy(false)
    }
  }

  const handleXlsxDrop = async (file: File) => {
    setXlsxFile(file)
    setXlsxStatus('Uploading workbook to server…')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadXlsx(formData).unwrap()
      setXlsxStatus(`Workbook uploaded! Sheets: ${res.sheets.join(', ')}`)
    } catch {
      setXlsxStatus('Failed to upload XLSX workbook to backend.')
    }
  }

  const swapSlots = () => {
    setSales(inventory)
    setInventory(sales)
  }

  const loadLocal = () => {
    if (!sales || !inventory || !validation.canLoad) return
    dispatch(
      loadLocalWorkspace({
        sales: sales.salesRows,
        inventory: inventory.inventoryRows,
      }),
    )
  }

  const loadFromApi = async () => {
    if (!sales?.file || !inventory?.file || !validation.canLoad) return
    setBusy(true)
    setParseError(null)
    try {
      const salesForm = new FormData()
      salesForm.append('file', sales.file)
      const salesRes = await uploadCsv(salesForm).unwrap()

      const invForm = new FormData()
      invForm.append('file', inventory.file)
      invForm.append('sessionId', salesRes.sessionId)
      const invRes = await uploadCsv(invForm).unwrap()

      const sessionRes = await createSession({
        salesSessionId: salesRes.sessionId,
        inventorySessionId: invRes.sessionId,
      }).unwrap()

      dispatch(
        loadLocalWorkspace({
          sales: sales.salesRows,
          inventory: inventory.inventoryRows,
        }),
      )

      dispatch(setSessionId(sessionRes.sessionId))
      dispatch(applyApiRows(sessionRes.rows))
      dispatch(setUseApi(true))
      try {
        localStorage.setItem('gno_active_session_id', sessionRes.sessionId)
      } catch {
        // Ignore localStorage quota errors
      }
      dispatch(closeUpload())
    } catch {
      setParseError('API upload failed. Ensure backend server is running.')
    } finally {
      setBusy(false)
    }
  }

  const loadBundledSamples = async () => {
    setBusy(true)
    setParseError(null)
    try {
      const [salesRes, invRes] = await Promise.all([
        fetch('/samples/sales-history.csv'),
        fetch('/samples/current-inventory.csv'),
      ])
      const salesFile = new File([await salesRes.blob()], 'sales-history.csv', { type: 'text/csv' })
      const invFile = new File([await invRes.blob()], 'current-inventory.csv', { type: 'text/csv' })
      const [parsedSales, parsedInv] = await Promise.all([parseCsvFile(salesFile), parseCsvFile(invFile)])
      setSales(parsedSales)
      setInventory(parsedInv)
    } catch {
      setParseError('Could not load bundled sample CSVs.')
      dispatch(setValidationFailed(true))
    } finally {
      setBusy(false)
    }
  }

  const salesTone =
    duplicate || swapped || (sales && sales.kind === 'inventory') ? 'error' : sales ? 'ok' : 'idle'
  const invTone =
    duplicate || swapped || (inventory && inventory.kind === 'sales') ? 'error' : inventory ? 'ok' : 'idle'
  const xlsxTone = xlsxFile ? 'ok' : 'idle'

  const isWorking = busy || isUploadingCsv || isUploadingXlsx || isCreatingSession

  const handleClose = () => dispatch(closeUpload())

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="upload-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 840 }}
      >
        <div className="modal__head">
          <h2 id="upload-title">Upload Data</h2>
          <button type="button" className="btn btn--ghost" onClick={handleClose}>
            Close
          </button>
        </div>

        <div className="drop-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <DropZone
            label="Slot 1 · Monthly Sales"
            hint="Drop sales CSV"
            fileName={sales?.file?.name}
            tone={salesTone}
            onFile={(file) => void assign('sales', file)}
          />
          <DropZone
            label="Slot 2 · Current Inventory"
            hint="Drop inventory CSV"
            fileName={inventory?.file?.name}
            tone={invTone}
            onFile={(file) => void assign('inventory', file)}
          />
          <DropZone
            label="Slot 3 · XLSX Workbook"
            hint="Optional verification"
            fileName={xlsxFile?.name}
            tone={xlsxTone}
            onFile={(file) => void handleXlsxDrop(file)}
          />
        </div>

        {xlsxStatus && <p className="banner banner--muted">{xlsxStatus}</p>}
        {isWorking && <p className="banner banner--muted">Processing files…</p>}
        {parseError && <p className="banner banner--error">{parseError}</p>}
        {duplicate && (
          <p className="banner banner--error">
            Duplicate File: Both slots contain the exact same file. Upload one Sales History CSV and one
            Current Inventory CSV.
          </p>
        )}
        {swapped && (
          <div className="banner banner--warn">
            <span>{swapped.message}</span>
            <button type="button" className="btn btn--small" onClick={swapSlots}>
              Swap Slots Automatically
            </button>
          </div>
        )}
        {sameSchema && <p className="banner banner--error">{sameSchema.message}</p>}
        {missing && (
          <div className="banner banner--error">
            <strong>Missing required columns:</strong>
            <ul>
              {missing.details.map((col) => (
                <li key={col}>{col}</li>
              ))}
            </ul>
          </div>
        )}

        {validation.canLoad && validation.summary && (
          <p className="banner banner--ok">
            Matched SKUs: {validation.summary.matchedSkus} | New / Partial-History SKUs (Manual Forecast
            Needed): {validation.summary.newOrPartialHistorySkus} | Delisted / Out-of-Stock SKUs:{' '}
            {validation.summary.delistedSkus}
          </p>
        )}

        <div className="modal__foot" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void loadBundledSamples()}
          >
            Use bundled samples
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!validation.canLoad || isWorking}
            onClick={loadLocal}
          >
            Load Local (Offline)
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!validation.canLoad || isWorking}
            onClick={() => void loadFromApi()}
          >
            Load from API
          </button>
        </div>
      </div>
    </div>
  )
}
