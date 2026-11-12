import { HASH_SLICE_BYTES } from '@gno/shared'
import type { FileFingerprint } from '@gno/shared'

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function fingerprintFile(file: File): Promise<FileFingerprint> {
  const head = await file.slice(0, HASH_SLICE_BYTES).arrayBuffer()
  const tailStart = Math.max(0, file.size - HASH_SLICE_BYTES)
  const tail = tailStart > HASH_SLICE_BYTES ? await file.slice(tailStart).arrayBuffer() : new ArrayBuffer(0)
  const combined = new Uint8Array(head.byteLength + tail.byteLength)
  combined.set(new Uint8Array(head), 0)
  combined.set(new Uint8Array(tail), head.byteLength)
  const hash = await sha256Hex(combined.buffer)
  return { name: file.name, size: file.size, hash }
}
