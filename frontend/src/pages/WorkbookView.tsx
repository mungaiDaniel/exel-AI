import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { workbooksApi } from '@/api/workbooks.api'
import { useWorkbookStore } from '@/store/workbookStore'
import type { Workbook, Sheet } from '@/types/workbook.types'
import { cn } from '@/utils/cn'

export default function WorkbookView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentSheetIndex, setSheet } = useWorkbookStore()
  const [workbook, setWorkbook] = useState<Workbook | null>(null)
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const [wb, sh] = await Promise.all([workbooksApi.get(id), workbooksApi.sheets(id)])
        setWorkbook(wb)
        setSheets(sh)
      } catch {
        toast.error('Failed to load workbook')
        navigate('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  const activeSheet = sheets[currentSheetIndex]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        {loading ? (
          <Skeleton className="h-7 w-48" />
        ) : (
          <h1 className="text-xl font-display font-semibold text-[--color-text-primary]">{workbook?.name}</h1>
        )}
      </div>

      {/* Sheet tabs */}
      {!loading && sheets.length > 1 && (
        <div className="flex gap-1 border-b border-[--color-border]">
          {sheets.map((sheet, i) => (
            <button
              key={sheet.id}
              onClick={() => setSheet(i)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px',
                i === currentSheetIndex
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-[--color-text-secondary] hover:text-[--color-text-primary]',
              )}
            >
              <Layers className="w-3 h-3" />
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Sheet content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
        </div>
      ) : activeSheet ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{activeSheet.row_count.toLocaleString()} rows</Badge>
            <Badge variant="default">{activeSheet.col_count} columns</Badge>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {activeSheet.columns.map(col => (
              <Badge key={col.name} variant={col.type === 'number' || col.type === 'currency' ? 'success' : col.type === 'datetime' ? 'warning' : 'default'}>
                {col.name}
                <span className="ml-1 opacity-60 text-[10px]">{col.type}</span>
              </Badge>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => navigate(`/workbooks/${id}/sheets/${activeSheet.id}`)}>
              View data & charts
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[--color-text-secondary]">No sheets found in this workbook.</p>
      )}
    </div>
  )
}
