import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft, BarChart3, Table, Lightbulb, Download, FileText, Image,
  AlertTriangle, Search, X, SlidersHorizontal, DollarSign, Target,
  TrendingUp, TrendingDown, Zap, Gauge, Trophy, Activity,
} from 'lucide-react'
import {
  Area, AreaChart as ReAreaChart, Bar, BarChart as ReBarChart, CartesianGrid,
  Cell, ComposedChart, Line, Pie, PieChart as RePieChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { DataTable } from '@/components/table/DataTable'
import { PivotTable } from '@/components/table/PivotTable'
import { BarChart }  from '@/components/charts/BarChart'
import { LineChart } from '@/components/charts/LineChart'
import { PieChart }  from '@/components/charts/PieChart'
import { AreaChart } from '@/components/charts/AreaChart'
import { workbooksApi } from '@/api/workbooks.api'
import { chartsApi }    from '@/api/charts.api'
import { exportApi }    from '@/api/export.api'
import { AnomalyPanel } from '@/components/ai/AnomalyPanel'
import type { Sheet, SheetData, SheetQueryResult } from '@/types/workbook.types'
import type { ChartSuggestion } from '@/types/chart.types'
import { cn } from '@/utils/cn'

type Tab = 'charts' | 'table' | 'pivot' | 'anomalies'

const DASHBOARD_COLORS = ['#4DD0C8', '#FFA64D', '#7F8CF4', '#D78BA8', '#60B783', '#C9C982', '#8CB8D8', '#B8A4D9']

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[$,%\s,]/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const formatMetric = (value: number, currency = false) => {
  const rounded = Math.round(value)
  return currency ? `$${rounded.toLocaleString()}` : rounded.toLocaleString()
}

const formatCompactMetric = (value: number, currency = false) => {
  const prefix = currency ? '$' : ''
  if (Math.abs(value) >= 1000000) return `${prefix}${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `${prefix}${(value / 1000).toFixed(0)}k`
  return `${prefix}${Math.round(value).toLocaleString()}`
}

const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base]
}

export default function SheetView() {
  const { workbookId, sheetId } = useParams<{ workbookId: string; sheetId: string }>()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [sheetData, setSheetData] = useState<SheetData | null>(null)
  const [queryResult, setQueryResult] = useState<SheetQueryResult | null>(null)
  const [suggestions, setSuggestions] = useState<ChartSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [queryLoading, setQueryLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('charts')
  const [exporting, setExporting] = useState<'csv' | 'pdf' | 'png' | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const chartAreaRef = useRef<HTMLDivElement>(null)
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sheetId || !workbookId) return
    const load = async () => {
      try {
        const [sh, data, sugg] = await Promise.all([
          workbooksApi.sheets(workbookId).then(s => s.find(x => x.id === sheetId) ?? null),
          workbooksApi.sheetData(sheetId, 1, 500),
          chartsApi.suggest(sheetId).catch(() => [] as ChartSuggestion[]),
        ])
        setSheet(sh)
        setSheetData(data)
        setSuggestions(sugg)
      } catch {
        toast.error('Failed to load sheet')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sheetId, workbookId])

  // Re-run query whenever filters change (debounced 300 ms)
  const runQuery = useCallback(() => {
    if (!sheetId) return
    const hasFilters = Object.values(filters).some(v => v.trim())
    if (!hasFilters) { setQueryResult(null); return }
    setQueryLoading(true)
    const params: Record<string, string> = {}
    for (const [k, v] of Object.entries(filters)) { if (v.trim()) params[k] = v.trim() }
    workbooksApi.querySheet(sheetId, params)
      .then(setQueryResult)
      .catch(() => toast.error('Query failed'))
      .finally(() => setQueryLoading(false))
  }, [sheetId, filters])

  useEffect(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(runQuery, 300)
    return () => { if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current) }
  }, [runQuery])

  const setFilter = (key: string, value: string) => {
    setFilters(prev => value ? { ...prev, [key]: value } : (() => { const n = { ...prev }; delete n[key]; return n })())
  }
  const clearAllFilters = () => { setFilters({}); setQueryResult(null) }
  const activeFilterCount = Object.keys(filters).length

  const tableData = queryResult ? queryResult.data : (sheetData?.data ?? [])
  const tableTotal = queryResult ? queryResult.total : (sheetData?.total ?? 0)

  const analytics = useMemo(() => {
    if (!sheet || !sheetData?.data.length) return null

    const numericColumns = sheet.columns.filter(col => col.type === 'number' || col.type === 'currency')
    const preferred = numericColumns.find(col => /revenue|sales|amount|total|price|cost|profit|income/i.test(col.name)) ?? numericColumns[0]
    if (!preferred) return null

    const labelColumn = sheet.columns.find(col => col.name !== preferred.name && col.type !== 'number' && col.type !== 'currency') ?? sheet.columns.find(col => col.name !== preferred.name)
    const rows = sheetData.data
      .map((row, index) => {
        const value = toNumber(row[preferred.name])
        return value === null ? null : {
          id: index + 1,
          label: labelColumn ? String(row[labelColumn.name] ?? `#${index + 1}`) : `#${index + 1}`,
          value,
        }
      })
      .filter((row): row is { id: number; label: string; value: number } => row !== null)

    if (!rows.length) return null

    const values = rows.map(row => row.value)
    const sorted = [...values].sort((a, b) => a - b)
    const total = values.reduce((sum, value) => sum + value, 0)
    const avg = total / values.length
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const median = quantile(sorted, 0.5)
    const q1 = quantile(sorted, 0.25)
    const q3 = quantile(sorted, 0.75)
    const stdev = Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length)
    const top = [...rows].sort((a, b) => b.value - a.value).slice(0, 3)
    const bottom = [...rows].sort((a, b) => a.value - b.value).slice(0, 3)
    const topShare = total ? top.reduce((sum, row) => sum + row.value, 0) / total : 0
    const aboveAvgRate = values.filter(value => value > avg).length / values.length
    const premiumThreshold = q3
    const premiumRate = values.filter(value => value >= premiumThreshold).length / values.length
    const currency = preferred.type === 'currency' || /revenue|sales|amount|price|cost|profit|income/i.test(preferred.name)
    const spread = max - min || 1
    const binCount = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(values.length))))
    const step = spread / binCount
    const distribution = Array.from({ length: binCount }, (_, i) => {
      const start = min + step * i
      const end = i === binCount - 1 ? max : min + step * (i + 1)
      return {
        range: `${formatCompactMetric(start, currency)}-${formatCompactMetric(end, currency)}`,
        count: values.filter(value => i === binCount - 1 ? value >= start && value <= end : value >= start && value < end).length,
      }
    })
    const cumulative = rows.reduce<{ label: string; value: number }[]>((acc, row, index) => {
      const previous = acc[index - 1]?.value ?? 0
      acc.push({ label: `#${row.id}`, value: previous + row.value })
      return acc
    }, [])
    const movingAverage = rows.map((row, index) => {
      const window = rows.slice(Math.max(0, index - 2), index + 1)
      return {
        label: `#${row.id}`,
        value: row.value,
        average: window.reduce((sum, item) => sum + item.value, 0) / window.length,
      }
    })
    const deviation = rows.map(row => ({ label: `#${row.id}`, value: row.value - avg }))
    const tierRanges = [
      { name: 'Low', color: '#4DD0C8', min: -Infinity, max: q1 },
      { name: 'Med', color: '#FFA64D', min: q1, max: median },
      { name: 'High', color: '#7F8CF4', min: median, max: q3 },
      { name: 'Premium', color: '#56D4E4', min: q3, max: Infinity },
    ]
    const tiers = tierRanges.map(tier => {
      const items = rows.filter(row => row.value >= tier.min && row.value <= tier.max)
      return {
        name: tier.name,
        label: `${tier.name} (${formatCompactMetric(tier.min === -Infinity ? min : tier.min, currency)}-${tier.max === Infinity ? `${formatCompactMetric(q3, currency)}+` : formatCompactMetric(tier.max, currency)})`,
        color: tier.color,
        count: items.length,
        value: items.reduce((sum, row) => sum + row.value, 0),
      }
    })

    return {
      metricName: preferred.name,
      labelName: labelColumn?.name ?? 'Record',
      rows,
      total,
      avg,
      min,
      max,
      median,
      q1,
      q3,
      stdev,
      top,
      bottom,
      topShare,
      aboveAvgRate,
      premiumRate,
      currency,
      distribution,
      cumulative,
      movingAverage,
      deviation,
      tiers,
      cv: avg ? stdev / avg : 0,
    }
  }, [sheet, sheetData])

  const tableColumns = useMemo(() => {
    if (!sheet) return []
    return sheet.columns.map((col): ColumnDef<Record<string, unknown>> => ({
      accessorKey: col.name,
      header: col.name,
      cell: info => String(info.getValue() ?? ''),
    }))
  }, [sheet])

  const handleExportCSV = async () => {
    if (!sheetId || !sheet) return
    setExporting('csv')
    try { await exportApi.csv(sheetId, `${sheet.name}.csv`) }
    catch { toast.error('CSV export failed') }
    finally { setExporting(null) }
  }

  const handleExportPDF = async () => {
    if (!sheetId || !sheet) return
    setExporting('pdf')
    try { await exportApi.pdf(sheetId, `${sheet.name}.pdf`) }
    catch { toast.error('PDF export failed') }
    finally { setExporting(null) }
  }

  const handleExportPNG = async () => {
    if (!chartAreaRef.current) return
    setExporting('png')
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(chartAreaRef.current, {
        backgroundColor: '#1A1D27',
        scale: 2,
        useCORS: true,
      })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${sheet?.name ?? 'charts'}.png`
      a.click()
    } catch { toast.error('PNG export failed') }
    finally { setExporting(null) }
  }

  const applyTransform = (
    s: ChartSuggestion,
    rawData: Record<string, unknown>[],
  ): { data: Record<string, unknown>[]; xKey: string; yKey: string } => {
    if (s.transform === 'missingness' && s.column) {
      const col = s.column
      const hasValue = rawData.filter(r => r[col] != null && r[col] !== '').length
      return {
        data: [
          { Status: 'Has Value', Rows: hasValue },
          { Status: 'Missing',   Rows: rawData.length - hasValue },
        ],
        xKey: 'Status',
        yKey: 'Rows',
      }
    }
    if (s.transform === 'value_counts' && s.column) {
      const col = s.column
      const counts: Record<string, number> = {}
      for (const row of rawData) {
        const val = String(row[col] ?? '(empty)')
        counts[val] = (counts[val] ?? 0) + 1
      }
      return {
        data: Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([name, count]) => ({ [col]: name, Rows: count })),
        xKey: col,
        yKey: 'Rows',
      }
    }
    return { data: rawData, xKey: s.x, yKey: s.y }
  }

  const renderChart = (s: ChartSuggestion) => {
    const rawData = sheetData?.data ?? []
    const { data, xKey, yKey } = applyTransform(s, rawData)
    switch (s.chart_type) {
      case 'line': return <LineChart data={data} xKey={xKey} yKey={yKey} />
      case 'area': return <AreaChart data={data} xKey={xKey} yKey={yKey} />
      case 'pie':  return <PieChart data={data} nameKey={xKey} valueKey={yKey} />
      default:     return <BarChart data={data} xKey={xKey} yKey={yKey} />
    }
  }

  const tabs: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: 'charts',    label: 'Analytics',   Icon: BarChart3 },
    { key: 'table',     label: 'Data Table',  Icon: Table },
    { key: 'pivot',     label: 'Pivot Table', Icon: BarChart3 },
    { key: 'anomalies', label: 'Anomalies',   Icon: AlertTriangle },
  ]

  const RingMetric = ({ label, value, accent = '#4DD0C8' }: { label: string; value: number; accent?: string }) => {
    const pct = Math.round(value * 100)
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-[#9FB3DA]">{label}</p>
        <div
          className="relative grid h-32 w-32 place-items-center rounded-full"
          style={{ background: `conic-gradient(${accent} 0 ${pct}%, #FFA64D ${pct}% ${Math.min(100, pct + 28)}%, #202842 0 100%)` }}
        >
          <div className="absolute inset-3 rounded-full bg-[#111827]" />
          <div className="absolute inset-5 rounded-full border border-[#25304B]" />
          <span className="relative text-3xl font-bold text-[#EAF1FF]">{pct}%</span>
        </div>
      </div>
    )
  }

  const DashboardPanel = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) => (
    <section className={cn('rounded-[20px] border border-[#26314E] bg-[#171E31] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]', className)}>
      <h3 className="mb-4 text-base font-semibold text-white">{title}</h3>
      {children}
    </section>
  )

  const renderAnalyticsDashboard = () => {
    if (!analytics) {
      return (
        <Card className="text-center py-12">
          <Lightbulb className="mx-auto w-8 h-8 text-[--color-text-tertiary] mb-3" />
          <p className="text-[--color-text-secondary]">No numeric data found for an analytics dashboard.</p>
        </Card>
      )
    }

    const metricCards = [
      { label: 'Total', value: analytics.total, Icon: DollarSign, color: 'text-[#4DD0C8]', bg: 'bg-[#1C3F4D]' },
      { label: 'Avg', value: analytics.avg, Icon: Target, color: 'text-[#FFA64D]', bg: 'bg-[#473624]' },
      { label: 'Max', value: analytics.max, Icon: TrendingUp, color: 'text-[#4DD0C8]', bg: 'bg-[#1C3F4D]' },
      { label: 'Min', value: analytics.min, Icon: TrendingDown, color: 'text-[#FFA64D]', bg: 'bg-[#473624]' },
      { label: 'StdDev', value: analytics.stdev, Icon: Activity, color: 'text-[#4DD0C8]', bg: 'bg-[#1C3F4D]' },
      { label: 'Median', value: analytics.median, Icon: Zap, color: 'text-[#FFA64D]', bg: 'bg-[#473624]' },
    ]

    return (
      <div ref={chartAreaRef} className="-mx-2 rounded-[28px] bg-[#111827] p-4 text-[#EAF1FF] sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{analytics.metricName} Analytics & Insights</h2>
            <p className="text-sm text-[#607096]">
              {analytics.rows.length.toLocaleString()} records - {formatMetric(analytics.total, analytics.currency)} total
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#8EA0C6]">
            <span className="text-xs font-semibold uppercase tracking-wide">Live</span>
            <span className="h-5 w-10 rounded-full border border-[#33405E] bg-[#26314E] p-0.5">
              <span className="block h-4 w-4 rounded-full bg-[#7382A2]" />
            </span>
            <span>Highlight</span>
            <button className="grid h-9 w-9 place-items-center rounded-full border border-[#26314E] text-[#4DD0C8]">
              <Gauge className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
          <DashboardPanel title="" className="min-h-[230px]">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <RingMetric label="Above Avg Rate" value={analytics.aboveAvgRate} />
              <RingMetric label="Top 3 Share" value={analytics.topShare} />
              <RingMetric label="Premium Rate" value={analytics.premiumRate} />
            </div>
          </DashboardPanel>

          <DashboardPanel title="Key Metrics">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {metricCards.map(({ label, value, Icon, color, bg }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border border-[#2A3653] bg-[#1D263A] px-3 py-2.5">
                  <span className={cn('grid h-8 w-8 place-items-center rounded-lg', bg)}>
                    <Icon className={cn('h-4 w-4', color)} />
                  </span>
                  <span className="flex-1 text-xs text-[#607096]">{label}</span>
                  <strong className="text-sm text-white">{formatMetric(value, analytics.currency)}</strong>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
          <DashboardPanel title={`${analytics.metricName} by Record ID`}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={analytics.rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#25304B" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="id" tickFormatter={id => `#${id}`} tick={{ fill: '#607096', fontSize: 12 }} axisLine={{ stroke: '#41506E' }} tickLine={false} />
                  <YAxis tickFormatter={value => formatCompactMetric(Number(value), analytics.currency)} tick={{ fill: '#607096', fontSize: 12 }} axisLine={{ stroke: '#41506E' }} tickLine={false} />
                  <Tooltip formatter={(value) => formatMetric(Number(value), analytics.currency)} labelFormatter={label => `Record #${label}`} />
                  <ReferenceLine y={analytics.avg} stroke="#FFA64D" strokeDasharray="4 4" />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {analytics.rows.map((_, index) => <Cell key={index} fill={DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]} />)}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Distribution">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={analytics.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid stroke="#25304B" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="range" angle={-25} textAnchor="end" tick={{ fill: '#607096', fontSize: 10 }} axisLine={{ stroke: '#41506E' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#607096', fontSize: 12 }} axisLine={{ stroke: '#41506E' }} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#45BDB4" radius={[4, 4, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <DashboardPanel title={`Cumulative ${analytics.metricName}`}>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ReAreaChart data={analytics.cumulative} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#25304B" strokeDasharray="3 4" />
                  <XAxis dataKey="label" hide />
                  <YAxis tickFormatter={value => formatCompactMetric(Number(value), analytics.currency)} tick={{ fill: '#607096', fontSize: 12 }} axisLine={{ stroke: '#41506E' }} tickLine={false} />
                  <Tooltip formatter={(value) => formatMetric(Number(value), analytics.currency)} />
                  <Area type="monotone" dataKey="value" stroke="#4DD0C8" fill="#22424D" strokeWidth={2} />
                </ReAreaChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>

          <DashboardPanel title="3-Period Moving Avg">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.movingAverage} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#25304B" strokeDasharray="3 4" />
                  <XAxis dataKey="label" hide />
                  <YAxis tickFormatter={value => formatCompactMetric(Number(value), analytics.currency)} tick={{ fill: '#607096', fontSize: 12 }} axisLine={{ stroke: '#41506E' }} tickLine={false} />
                  <Tooltip formatter={(value) => formatMetric(Number(value), analytics.currency)} />
                  <Bar dataKey="value" fill="#2B6970" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="average" stroke="#FFA64D" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Deviation from Avg">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={analytics.deviation} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#25304B" strokeDasharray="3 4" />
                  <XAxis dataKey="label" hide />
                  <YAxis tickFormatter={value => formatCompactMetric(Number(value), analytics.currency)} tick={{ fill: '#607096', fontSize: 12 }} axisLine={{ stroke: '#41506E' }} tickLine={false} />
                  <Tooltip formatter={(value) => formatMetric(Number(value), analytics.currency)} />
                  <ReferenceLine y={0} stroke="#607096" />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {analytics.deviation.map((row, index) => <Cell key={index} fill={row.value >= 0 ? '#45A7A1' : '#C06291'} />)}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <DashboardPanel title="Tier Distribution">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={analytics.tiers} dataKey="count" nameKey="label" innerRadius={48} outerRadius={82} paddingAngle={1}>
                    {analytics.tiers.map(tier => <Cell key={tier.name} fill={tier.color} />)}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-[#9FB3DA]">
              {analytics.tiers.map(tier => (
                <span key={tier.name} className="flex items-center gap-1">
                  <span className="h-3 w-3" style={{ backgroundColor: tier.color }} />
                  {tier.label}
                </span>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel title={`${analytics.metricName} by Tier`}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={analytics.tiers} layout="vertical" margin={{ top: 10, right: 15, left: 16, bottom: 0 }}>
                  <CartesianGrid stroke="#25304B" strokeDasharray="3 4" horizontal={false} />
                  <XAxis type="number" tickFormatter={value => formatCompactMetric(Number(value), analytics.currency)} tick={{ fill: '#607096', fontSize: 12 }} axisLine={{ stroke: '#41506E' }} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#607096', fontSize: 12 }} axisLine={{ stroke: '#41506E' }} tickLine={false} width={64} />
                  <Tooltip formatter={(value) => formatMetric(Number(value), analytics.currency)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {analytics.tiers.map(tier => <Cell key={tier.name} fill={tier.color} />)}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Scatter">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#25304B" strokeDasharray="3 4" />
                  <XAxis dataKey="id" type="number" tick={{ fill: '#607096', fontSize: 12 }} axisLine={{ stroke: '#41506E' }} tickLine={false} />
                  <YAxis dataKey="value" tickFormatter={value => formatCompactMetric(Number(value), analytics.currency)} tick={{ fill: '#607096', fontSize: 12 }} axisLine={{ stroke: '#41506E' }} tickLine={false} />
                  <Tooltip formatter={(value) => formatMetric(Number(value), analytics.currency)} />
                  <Scatter data={analytics.rows} fill="#4DD0C8">
                    {analytics.rows.map((_, index) => <Cell key={index} fill={DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <DashboardPanel title="Key Insights">
            <div className="space-y-2">
              <div className="rounded-lg border border-[#2A3653] bg-[#1D263A] p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#4DD0C8]"><Trophy className="h-4 w-4" /> {analytics.metricName} Concentration</p>
                <p className="text-sm text-[#9FB3DA]">Top 3 records contribute {(analytics.topShare * 100).toFixed(1)}% of total {analytics.metricName}.</p>
              </div>
              <div className="rounded-lg border border-[#2A3653] bg-[#1D263A] p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#FFA64D]"><Activity className="h-4 w-4" /> Variability</p>
                <p className="text-sm text-[#9FB3DA]">CV: {(analytics.cv * 100).toFixed(1)}%. IQR: {formatMetric(analytics.q3 - analytics.q1, analytics.currency)}.</p>
              </div>
              <div className="rounded-lg border border-[#2A3653] bg-[#1D263A] p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#4DD0C8]"><TrendingUp className="h-4 w-4" /> Mean vs Median</p>
                <p className="text-sm text-[#9FB3DA]">Mean {formatMetric(analytics.avg, analytics.currency)} {analytics.avg > analytics.median ? '>' : '<='} Median {formatMetric(analytics.median, analytics.currency)}.</p>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel title="More Insights">
            <div className="space-y-2">
              <div className="rounded-lg border border-[#2A3653] bg-[#1D263A] p-4">
                <p className="mb-1 text-sm font-semibold text-[#7F8CF4]">Tier Breakdown</p>
                <p className="text-sm text-[#9FB3DA]">
                  {analytics.tiers.map(tier => `${tier.name}: ${tier.count} (${formatMetric(tier.value, analytics.currency)})`).join(' | ')}
                </p>
              </div>
              <div className="rounded-lg border border-[#2A3653] bg-[#1D263A] p-4">
                <p className="mb-1 text-sm font-semibold text-[#F472B6]">Bottom 3</p>
                <p className="text-sm text-[#9FB3DA]">
                  IDs {analytics.bottom.map(row => `#${row.id}`).join(', ')} = {formatMetric(analytics.bottom.reduce((sum, row) => sum + row.value, 0), analytics.currency)}.
                </p>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel title="Top 3">
            <div className="space-y-2">
              {analytics.top.map((row, index) => (
                <div key={row.id} className="grid grid-cols-[48px_1fr_auto_auto] items-center gap-3 rounded-lg bg-[#1D3347] px-3 py-2 text-sm">
                  <span className="text-[#607096]">#{index + 1}</span>
                  <strong className="truncate text-white">{analytics.labelName} {row.label}</strong>
                  <strong className="text-white">{formatMetric(row.value, analytics.currency)}</strong>
                  <span className="text-[#607096]">{analytics.total ? ((row.value / analytics.total) * 100).toFixed(1) : '0.0'}%</span>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Bottom 3">
            <div className="space-y-2">
              {analytics.bottom.map((row, index) => (
                <div key={row.id} className="grid grid-cols-[48px_1fr_auto_auto] items-center gap-3 rounded-lg bg-[#28263D] px-3 py-2 text-sm">
                  <span className="text-[#607096]">#{analytics.rows.length - index}</span>
                  <strong className="truncate text-white">{analytics.labelName} {row.label}</strong>
                  <strong className="text-white">{formatMetric(row.value, analytics.currency)}</strong>
                  <span className="text-[#607096]">{analytics.total ? ((row.value / analytics.total) * 100).toFixed(1) : '0.0'}%</span>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>

        {/* Statistical Summary */}
        <div className="mt-5">
          <DashboardPanel title="Statistical Summary">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'COUNT', value: analytics.rows.length.toLocaleString(), raw: false },
                { label: 'SUM',   value: formatMetric(analytics.total, analytics.currency), raw: false },
                { label: 'MEAN',  value: formatMetric(analytics.avg, analytics.currency), raw: false },
                { label: 'MEDIAN',value: formatMetric(analytics.median, analytics.currency), raw: false },
                { label: 'STD DEV', value: formatMetric(analytics.stdev, analytics.currency), raw: false },
                { label: 'CV',    value: `${(analytics.cv * 100).toFixed(1)}%`, raw: false },
                { label: 'MIN',   value: formatMetric(analytics.min, analytics.currency), raw: false },
                { label: 'MAX',   value: formatMetric(analytics.max, analytics.currency), raw: false },
                { label: 'RANGE', value: formatMetric(analytics.max - analytics.min, analytics.currency), raw: false },
                { label: 'Q1',    value: formatMetric(analytics.q1, analytics.currency), raw: false },
                { label: 'Q3',    value: formatMetric(analytics.q3, analytics.currency), raw: false },
                { label: 'IQR',   value: formatMetric(analytics.q3 - analytics.q1, analytics.currency), raw: false },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl border border-[#2A3653] bg-[#1D263A] px-4 py-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#607096] mb-1">{stat.label}</p>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/workbooks/${workbookId}`)}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        {sheet && <h1 className="text-xl font-display font-semibold text-[--color-text-primary] flex-1">{sheet.name}</h1>}

        {/* Export buttons */}
        <div className="flex gap-2">
          <Button
            variant="secondary" size="sm"
            onClick={handleExportCSV}
            loading={exporting === 'csv'}
            disabled={!!exporting}
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button
            variant="secondary" size="sm"
            onClick={handleExportPDF}
            loading={exporting === 'pdf'}
            disabled={!!exporting}
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </Button>
          {tab === 'charts' && (
            <Button
              variant="secondary" size="sm"
              onClick={handleExportPNG}
              loading={exporting === 'png'}
              disabled={!!exporting}
            >
              <Image className="w-3.5 h-3.5" /> PNG
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-elevated p-1 rounded-lg w-fit">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === key
                ? 'bg-surface-card text-[--color-text-primary] shadow-sm'
                : 'text-[--color-text-secondary] hover:text-[--color-text-primary]',
            )}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : tab === 'charts' ? (
        renderAnalyticsDashboard()
      ) : tab === 'table' ? (
        sheet && sheetData ? (
          <div className="space-y-3">
            {/* Filter bar toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(v => !v)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-colors',
                  showFilters || activeFilterCount > 0
                    ? 'border-brand-primary/50 bg-brand-primary/10 text-brand-primary'
                    : 'border-[--color-border] text-[--color-text-secondary] hover:border-brand-primary/30',
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-brand-primary text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {queryResult && (
                <span className="text-xs text-[--color-text-tertiary]">
                  {queryLoading ? 'Filtering…' : `${queryResult.total.toLocaleString()} of ${sheetData.total.toLocaleString()} rows match`}
                </span>
              )}
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="p-4 bg-surface-elevated rounded-xl border border-[--color-border] space-y-3">
                {/* Full-text search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--color-text-tertiary]" />
                  <input
                    type="text"
                    placeholder="Search all cells…"
                    value={filters.q ?? ''}
                    onChange={e => setFilter('q', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-surface-card border border-[--color-border] rounded-lg text-[--color-text-primary] placeholder:text-[--color-text-tertiary] outline-none focus:border-brand-primary"
                  />
                </div>

                {/* Per-column filters */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {sheet.columns.slice(0, 8).map(col => {
                    const isNumeric = col.type === 'number' || col.type === 'currency'
                    return isNumeric ? (
                      <div key={col.name} className="space-y-1">
                        <p className="text-[10px] text-[--color-text-tertiary] font-medium truncate">{col.name}</p>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            placeholder="min"
                            value={filters[`${col.name}_gte`] ?? ''}
                            onChange={e => setFilter(`${col.name}_gte`, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-surface-card border border-[--color-border] rounded-md text-[--color-text-primary] placeholder:text-[--color-text-tertiary] outline-none focus:border-brand-primary"
                          />
                          <input
                            type="number"
                            placeholder="max"
                            value={filters[`${col.name}_lte`] ?? ''}
                            onChange={e => setFilter(`${col.name}_lte`, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-surface-card border border-[--color-border] rounded-md text-[--color-text-primary] placeholder:text-[--color-text-tertiary] outline-none focus:border-brand-primary"
                          />
                        </div>
                      </div>
                    ) : (
                      <div key={col.name} className="space-y-1">
                        <p className="text-[10px] text-[--color-text-tertiary] font-medium truncate">{col.name}</p>
                        <input
                          type="text"
                          placeholder={`contains…`}
                          value={filters[`${col.name}_like`] ?? ''}
                          onChange={e => setFilter(`${col.name}_like`, e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-surface-card border border-[--color-border] rounded-md text-[--color-text-primary] placeholder:text-[--color-text-tertiary] outline-none focus:border-brand-primary"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <DataTable data={tableData} columns={tableColumns} searchable={!activeFilterCount} />
            {queryResult?.has_more && (
              <p className="text-xs text-[--color-text-tertiary] text-center">
                Showing first {queryResult.data.length.toLocaleString()} of {queryResult.total.toLocaleString()} matching rows
              </p>
            )}
          </div>
        ) : null
      ) : tab === 'pivot' ? (
        sheet && sheetData ? (
          <PivotTable data={sheetData.data} columns={sheet.columns} />
        ) : null
      ) : tab === 'anomalies' ? (
        sheetId ? <AnomalyPanel sheetId={sheetId} /> : null
      ) : null}
    </div>
  )
}
