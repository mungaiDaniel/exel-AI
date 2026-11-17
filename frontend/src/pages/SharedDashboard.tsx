import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { BarChart }  from '@/components/charts/BarChart'
import { LineChart } from '@/components/charts/LineChart'
import { PieChart }  from '@/components/charts/PieChart'
import { AreaChart } from '@/components/charts/AreaChart'
import { ChartWrapper } from '@/components/charts/ChartWrapper'
import { dashboardsApi, type Dashboard, type LayoutItem } from '@/api/dashboards.api'
import { workbooksApi } from '@/api/workbooks.api'
import type { SheetData } from '@/types/workbook.types'

export default function SharedDashboard() {
  const { token } = useParams<{ token: string }>()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [sheetData, setSheetData] = useState<Record<string, SheetData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const d = await dashboardsApi.getShared(token)
        setDashboard(d)
        const sheetIds = [...new Set(d.layout.map(l => l.sheet_id).filter(Boolean))] as string[]
        const entries = await Promise.all(
          sheetIds.map(sid => workbooksApi.sheetData(sid, 1, 200).then(data => [sid, data] as const))
        )
        setSheetData(Object.fromEntries(entries))
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const renderChart = (item: LayoutItem) => {
    const data = item.sheet_id ? (sheetData[item.sheet_id]?.data ?? []) : []
    const p = { data, xKey: item.x_key ?? '', yKey: item.y_key ?? '' }
    switch (item.chart_type) {
      case 'bar':  return <BarChart {...p} />
      case 'line': return <LineChart {...p} />
      case 'area': return <AreaChart {...p} />
      case 'pie':  return <PieChart data={data} nameKey={item.x_key ?? ''} valueKey={item.y_key ?? ''} />
      default:     return <BarChart {...p} />
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-surface-base p-8 space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-72" />)}</div>
    </div>
  )

  if (error || !dashboard) return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center">
      <div className="text-center">
        <p className="text-xl font-display font-bold text-[--color-text-primary] mb-2">Dashboard not found</p>
        <p className="text-[--color-text-secondary] text-sm">This link may have expired or sharing was disabled.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-base">
      <header className="flex items-center gap-3 px-8 h-16 border-b border-[--color-border] bg-surface-card">
        <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center">
          <span className="text-white font-bold text-xs font-display">E</span>
        </div>
        <span className="font-display font-bold text-brand-primary">ExcelAI</span>
        <span className="text-[--color-text-tertiary]">/</span>
        <h1 className="font-semibold text-[--color-text-primary]">{dashboard.name}</h1>
        <span className="ml-auto text-xs text-[--color-text-tertiary]">Read-only shared view</span>
      </header>
      <main className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboard.layout.map(item => (
            <ChartWrapper key={item.i} title={item.title ?? undefined}>
              {renderChart(item)}
            </ChartWrapper>
          ))}
        </div>
      </main>
    </div>
  )
}
