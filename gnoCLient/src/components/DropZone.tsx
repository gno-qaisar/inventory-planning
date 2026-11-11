import { useRef, type DragEvent } from 'react'

interface DropZoneProps {
  label: string
  hint: string
  fileName?: string
  tone: 'idle' | 'ok' | 'error'
  onFile: (file: File) => void
}

export function DropZone({ label, hint, fileName, tone, onFile }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const take = (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (file) onFile(file)
  }

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    take(event.dataTransfer.files)
  }

  return (
    <button
      type="button"
      className={`dropzone dropzone--${tone}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <span className="dropzone__label">{label}</span>
      <span className="dropzone__hint">{fileName ?? hint}</span>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
    </button>
  )
}
