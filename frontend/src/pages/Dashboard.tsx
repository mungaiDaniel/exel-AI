import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { FileSpreadsheet, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { DropZone } from '@/components/upload/DropZone'
import { InsightCard } from '@/components/ai/InsightCard'
import { workbooksApi } from '@/api/workbooks.api'
import { useWorkbookStore } from '@/store/workbookStore'
import { formatFileSize, formatDate, formatNumber } from '@/utils/formatters'
import type { Workbook } from '@/types/workbook.types'

export default function Dashboard() {
  const navigate = useNavigate()
  const { setWorkbook } = useWorkbookStore()
  const [workbooks, setWorkbooks] = useState<Workbook[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [latestInsights, setLatestInsights] = useState<{ name: string; insights: string[] } | null>(null)

  const fetchWorkbooks = async () => {
    try {
      const data = await workbooksApi.list()
      setWorkbooks(data.items)
    } catch {
      toast.error('Failed to load workbooks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWorkbooks() }, [])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const wb = await workbooksApi.upload(file)
      toast.success(`"${wb.name}" uploaded successfully`)
      setWorkbooks(prev => [wb, ...prev])
      const insights = (wb.meta as Record<string, unknown>)?.insights as string[] | undefined
      if (insights?.length) setLatestInsights({ name: wb.name, insights })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await workbooksApi.delete(id)
      setWorkbooks(prev => prev.filter(w => w.id !== id))
      toast.success('Workbook deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  const openWorkbook = (wb: Workbook) => {
    setWorkbook(wb.id)
    navigate(`/workbooks/${wb.id}`)
  }

  const statusBadge = (status: Workbook['status']) => {
    if (status === 'ready') return <Badge variant="success">Ready</Badge>
    if (status === 'processing') return <Badge variant="warning">Processing</Badge>
    return <Badge variant="error">Error</Badge>
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Upload area */}
      <div>
        <h2 className="text-xl font-display font-semibold text-[--color-text-primary] mb-4">Upload a workbook</h2>
        <DropZone onUpload={handleUpload} loading={uploading} />
      {latestInsights && (
        <InsightCard insights={latestInsights.insights} workbookName={latestInsights.name} />
      )}
      </div>

      {/* Stats row */}
      {!loading && workbooks.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Workbooks', value: workbooks.length },
            { label: 'Total rows', value: formatNumber(workbooks.reduce((s, w) => s + w.row_count, 0)) },
            { label: 'Ready', value: workbooks.filter(w => w.status === 'ready').length },
          ].map(({ label, value }) => (
            <Card key={label} className="text-center">
              <p className="stat-value">{value}</p>
              <p className="text-xs text-[--color-text-secondary] mt-1 uppercase tracking-wider font-semibold">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Workbook list */}
      <div>
        <h2 className="text-xl font-display font-semibold text-[--color-text-primary] mb-4">Your workbooks</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : workbooks.length === 0 ? (
          <Card className="text-center py-12">
            <FileSpreadsheet className="mx-auto w-10 h-10 text-[--color-text-tertiary] mb-3" />
            <p className="text-[--color-text-secondary]">No workbooks yet. Upload your first Excel file above.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {workbooks.map(wb => (
              <Card
                key={wb.id}
                className="flex items-center gap-4 cursor-pointer hover:border-brand-primary/50 hover:shadow-glow transition-all duration-[--transition-fast] p-4"
                onClick={() => openWorkbook(wb)}
              >
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-brand-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[--color-text-primary] truncate">{wb.name}</p>
                  <p className="text-xs text-[--color-text-tertiary] mt-0.5">
                    {wb.sheet_count} sheet{wb.sheet_count !== 1 ? 's' : ''} · {formatNumber(wb.row_count)} rows · {formatFileSize(wb.file_size)} · {formatDate(wb.created_at)}
                  </p>
                </div>
                {statusBadge(wb.status)}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(wb.id, wb.name) }}
                  className="p-2 rounded hover:bg-red-900/20 text-[--color-text-tertiary] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-[--color-text-tertiary]" />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
