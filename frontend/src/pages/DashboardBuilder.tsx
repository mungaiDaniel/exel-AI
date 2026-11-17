import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import GridLayout, { type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import {
  ArrowLeft, Save, Share2, Link, X, Plus, BarChart3, TrendingUp,
  PieChart as PieIcon, Activity, Scatter, Check, Copy, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { BarChart }  from '@/components/charts/BarChart'
import { LineChart } from '@/components/charts/LineChart'
import { PieChart }  from '@/components/charts/PieChart'
import { AreaChart } from '@/components/charts/AreaChart'
import { dashboardsApi, type Dashboard, type LayoutItem } from '@/api/dashboards.api'
import { workbooksApi } from '@/api/workbooks.api'
import { chartsApi } from '@/api/charts.api'
import type { Sheet, SheetData } from '@/types/workbook.types'
import type { ChartSuggestion } from '@/types/chart.types'
import { cn } from '@/utils/cn'

const CHART_ICONS: Record<string, React.ElementType> = {
  bar: BarChart3, line: TrendingUp, area: Activity, pie: PieIcon, scatter: Scatter,
}

// Apply data transforms before rendering
function applyTransform(
  rawData: Record<string, unknown>[],
  transform?: string,
  column?: string,
): Record<string, unknown>[] {
  if (!transform || !column) return rawData

  if (transform === 'missingness') {
    const total = rawData.length
    const missing = rawData.filter(r => r[column] == null || r[column] === '').length
    return [
      { Status: 'Has value', Rows: total - missing },
      { Status: 'Missing', Rows: missing },
    ]
  }

  if (transform === 'value_counts') {
    const counts: Record<string, number> = {}
    for (const row of rawData) {
      const val = String(row[column] ?? '(blank)')
      counts[val] = (counts[val] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k, v]) => ({ [column]: k, Rows: v }))
  }

  return rawData
}

export default function DashboardBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [sheetData, setSheetData] = useState<Record<string, SheetData>>({})
  const [suggestions, setSuggestions] = useState<ChartSuggestion[]>([])
  const [layout, setLayout] = useState<LayoutItem[]>([])
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [containerWidth, setContainerWidth] = useState(1200)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoPopulated = useRef(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const d = await dashboardsApi.get(id)
        setDashboard(d)
        const existingLayout = d.layout ?? []
        setLayout(existingLayout)
        if (d.share_token) setShareUrl(`${window.location.origin}/shared/${d.share_token}`)

        const sh = await workbooksApi.sheets(d.workbook_id)
        setSheets(sh)

        if (sh[0]) {
          const [data, sugg] = await Promise.all([
            workbooksApi.sheetData(sh[0].id, 1, 200),
            chartsApi.suggest(sh[0].id).catch(() => [] as ChartSuggestion[]),
          ])
          setSheetData({ [sh[0].id]: data })
          setSuggestions(sugg)

          // Auto-populate charts when dashboard is new/empty
          if (existingLayout.length === 0 && sugg.length > 0 && !autoPopulated.current) {
            autoPopulated.current = true
            const autoLayout: LayoutItem[] = sugg.map((s, idx) => ({
              i: `chart-auto-${idx}`,
              x: (idx % 2) * 6,
              y: Math.floor(idx / 2) * 5,
              w: 6,
              h: 4,
              chart_type: s.chart_type,
              x_key: s.x,
              y_key: s.y,
              title: s.title,
              sheet_id: sh[0].id,
              transform: s.transform,
              column: s.column,
            }))
            setLayout(autoLayout)
            // Save immediately so they persist
            await dashboardsApi.update(id, { layout: autoLayout }).catch(() => null)
          }
        }
      } catch {
        toast.error('Failed to load dashboard')
        navigate('/dashboards')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const addChart = (s: ChartSuggestion) => {
    const newItem: LayoutItem = {
      i: `chart-${Date.now()}`,
      x: (layout.length * 2) % 12,
      y: Infinity,
      w: 6, h: 4,
      chart_type: s.chart_type,
      x_key: s.x,
      y_key: s.y,
      title: s.title,
      sheet_id: sheets[0]?.id,
      transform: s.transform,
      column: s.column,
    }
    setLayout(prev => [...prev, newItem])
    setShowPicker(false)
  }

  const removeChart = (i: string) => setLayout(prev => prev.filter(item => item.i !== i))

  const onLayoutChange = (newLayout: Layout[]) => {
    setLayout(prev => prev.map(item => {
      const found = newLayout.find(l => l.i === item.i)
      return found ? { ...item, x: found.x, y: found.y, w: found.w, h: found.h } : item
    }))
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      await dashboardsApi.update(id, { layout })
      toast.success('Dashboard saved')
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async () => {
    if (!id) return
    setSharing(true)
    try {
      if (shareUrl) {
        await dashboardsApi.unshare(id)
        setShareUrl(null)
        setDashboard(d => d ? { ...d, is_public: false, share_token: null } : d)
        toast.success('Sharing disabled')
      } else {
        const result = await dashboardsApi.share(id)
        const url = `${window.location.origin}/shared/${result.share_token}`
        setShareUrl(url)
        toast.success('Dashboard is now public')
      }
    } catch {
      toast.error('Failed to update sharing')
    } finally {
      setSharing(false)
    }
  }

  const copyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderChart = (item: LayoutItem) => {
    const rawData = item.sheet_id ? (sheetData[item.sheet_id]?.data ?? []) : []
    const data = applyTransform(rawData, item.transform, item.column)
    const xKey = item.transform === 'value_counts' ? (item.column ?? item.x_key ?? '') : (item.x_key ?? '')
    const yKey = item.transform ? 'Rows' : (item.y_key ?? '')
    const props = { data, xKey, yKey }

    switch (item.chart_type) {
      case 'line':    return <LineChart {...props} />
      case 'area':    return <AreaChart {...props} />
      case 'pie':     return <PieChart data={data} nameKey={item.transform === 'missingness' ? 'Status' : xKey} valueKey={yKey} />
      case 'scatter': return <BarChart {...props} />  // scatter falls back to bar
      case 'bar':
      default:        return <BarChart {...props} />
    }
  }

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-12" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboards')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-xl font-display font-semibold text-[--color-text-primary] flex-1 min-w-0 truncate">
          {dashboard?.name}
        </h1>
        <Button variant="secondary" size="sm" onClick={() => setShowPicker(v => !v)}>
          <Plus className="w-4 h-4" /> Add chart
        </Button>
        <Button
          variant={shareUrl ? 'secondary' : 'ghost'}
          size="sm"
          onClick={handleShare}
          loading={sharing}
        >
          <Share2 className="w-4 h-4" />
          {shareUrl ? 'Shared' : 'Share'}
        </Button>
        <Button size="sm" onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" /> Save
        </Button>
      </div>

      {/* Share URL bar */}
      {shareUrl && (
        <div className="flex items-center gap-2 p-3 bg-surface-elevated border border-brand-primary/30 rounded-lg">
          <Link className="w-4 h-4 text-brand-primary shrink-0" />
          <span className="text-sm text-[--color-text-secondary] flex-1 truncate">{shareUrl}</span>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 text-sm text-brand-primary hover:underline"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Chart picker */}
      {showPicker && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-primary" />
              <p className="text-sm font-semibold text-[--color-text-primary]">AI-suggested charts</p>
            </div>
            <button onClick={() => setShowPicker(false)}><X className="w-4 h-4 text-[--color-text-tertiary]" /></button>
          </div>
          {suggestions.length === 0 ? (
            <p className="text-sm text-[--color-text-tertiary]">No suggestions — ensure the workbook has numeric columns.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {suggestions.map((s, i) => {
                const Icon = CHART_ICONS[s.chart_type] ?? BarChart3
                const alreadyAdded = layout.some(l => l.title === s.title)
                return (
                  <button
                    key={i}
                    onClick={() => !alreadyAdded && addChart(s)}
                    disabled={alreadyAdded}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border text-left transition-all',
                      alreadyAdded
                        ? 'border-brand-primary/40 bg-brand-primary/5 opacity-60 cursor-default'
                        : 'border-[--color-border] hover:border-brand-primary/50 hover:bg-surface-hover cursor-pointer'
                    )}
                  >
                    <Icon className="w-4 h-4 text-brand-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[--color-text-primary] truncate">{s.title}</p>
                      <p className="text-[10px] text-[--color-text-tertiary] capitalize">{s.chart_type}</p>
                    </div>
                    {alreadyAdded && <Check className="w-3 h-3 text-brand-primary ml-auto shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Grid */}
      <div ref={containerRef} className="w-full">
        {layout.length === 0 ? (
          <Card className="text-center py-16">
            <BarChart3 className="mx-auto w-10 h-10 text-[--color-text-tertiary] mb-3" />
            <p className="text-[--color-text-secondary] mb-1">No charts yet.</p>
            <p className="text-xs text-[--color-text-tertiary] mb-4">
              {suggestions.length > 0
                ? `${suggestions.length} chart${suggestions.length !== 1 ? 's' : ''} suggested from your workbook data`
                : 'Upload a workbook with numeric data to get chart suggestions'}
            </p>
            <Button size="sm" onClick={() => setShowPicker(true)}>
              <Plus className="w-4 h-4" /> Add your first chart
            </Button>
          </Card>
        ) : (
          <GridLayout
            className="layout"
            layout={layout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))}
            cols={12}
            rowHeight={80}
            width={containerWidth}
            onLayoutChange={onLayoutChange}
            draggableHandle=".drag-handle"
          >
            {layout.map(item => (
              <div key={item.i} className="bg-surface-card border border-[--color-border] rounded-lg overflow-hidden flex flex-col">
                <div className="drag-handle flex items-center gap-2 px-3 py-2 border-b border-[--color-border] cursor-grab active:cursor-grabbing bg-surface-elevated">
                  <span className="text-xs font-medium text-[--color-text-secondary] flex-1 truncate">{item.title ?? item.chart_type}</span>
                  <button
                    onClick={() => removeChart(item.i)}
                    className="p-0.5 rounded hover:bg-surface-hover text-[--color-text-tertiary] hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 p-2">
                  {renderChart(item)}
                </div>
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </div>
  )
}
