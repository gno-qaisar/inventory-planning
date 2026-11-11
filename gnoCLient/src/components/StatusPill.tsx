import type { DataStatus } from '@gno/shared'

export function StatusPill({ status }: { status: DataStatus }) {
  if (status.kind === 'ready') {
    return <span className="status-pill status-pill--ok">{status.skuCount} SKUs Active</span>
  }
  if (status.kind === 'failed') {
    return <span className="status-pill status-pill--bad">Validation Failed</span>
  }
  return <span className="status-pill">No Data</span>
}
