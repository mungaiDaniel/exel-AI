import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatFileSize } from '@/utils/formatters'
import { Button } from '@/components/ui/Button'

interface DropZoneProps {
  onUpload: (file: File) => Promise<void>
  loading?: boolean
}

const ACCEPTED = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
}

export function DropZone({ onUpload, loading }: DropZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setSelectedFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    disabled: loading,
  })

  const handleUpload = async () => {
    if (!selectedFile) return
    await onUpload(selectedFile)
    setSelectedFile(null)
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-[--transition-fast]',
          isDragActive
            ? 'border-brand-primary bg-brand-primary/5 shadow-glow'
            : 'border-[--color-border] hover:border-brand-primary/50 hover:bg-surface-hover',
          loading && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto w-10 h-10 text-[--color-text-tertiary] mb-4" />
        <p className="text-[--color-text-primary] font-medium mb-1">
          {isDragActive ? 'Drop your file here' : 'Drag & drop your Excel file'}
        </p>
        <p className="text-sm text-[--color-text-tertiary]">
          .xlsx, .xls, .csv — up to 50 MB
        </p>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg border border-[--color-border]">
          <FileSpreadsheet className="w-5 h-5 text-brand-secondary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[--color-text-primary] truncate">{selectedFile.name}</p>
            <p className="text-xs text-[--color-text-tertiary]">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1 rounded hover:bg-surface-hover text-[--color-text-tertiary] hover:text-[--color-text-primary]"
          >
            <X className="w-4 h-4" />
          </button>
          <Button onClick={handleUpload} loading={loading} size="sm">
            Upload
          </Button>
        </div>
      )}
    </div>
  )
}
