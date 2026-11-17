/**
 * Deterministic, clearly fake sample data for demo mode.
 * Nothing here refers to real people, companies, emails or phone numbers.
 */
import type { ColumnInfo } from '@/types/workbook.types'

export type Row = Record<string, unknown>

export interface DemoSheet {
  id: string
  workbook_id: string
  name: string
  index: number
  row_count: number
  col_count: number
  columns: ColumnInfo[]
  summary: string | null
  created_at: string
  data: Row[]
}

export interface DemoWorkbook {
  id: string
  name: string
  file_name: string
  file_size: number
  status: 'ready'
  sheet_count: number
  row_count: number
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DemoDashboard {
  id: string
  workbook_id: string
  user_id: string
  name: string
  layout: Record<string, unknown>[]
  is_public: boolean
  share_token: string | null
  created_at: string
  updated_at: string
}

// Small seeded PRNG so every visitor sees the same numbers.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CURRENCY_HINTS = ['price', 'cost', 'revenue', 'salary', 'amount', 'total', 'fee', 'budget', 'spend']

export function inferColumns(rows: Row[]): ColumnInfo[] {
  if (!rows.length) return []
  return Object.keys(rows[0]).map(name => {
    const values = rows.map(r => r[name]).filter(v => v !== null && v !== undefined && v !== '')
    const numeric = values.length > 0 && values.every(v => typeof v === 'number')
    const isDate = values.length > 0 && values.every(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v))
    const type: ColumnInfo['type'] = isDate
      ? 'datetime'
      : numeric
        ? CURRENCY_HINTS.some(h => name.toLowerCase().includes(h))
          ? 'currency'
          : 'number'
        : 'text'
    return {
      name,
      type,
      nullable: values.length < rows.length,
      unique_count: new Set(values).size,
      sample_values: values.slice(0, 5),
    }
  })
}

const round2 = (n: number) => Math.round(n * 100) / 100

function buildSales(): Row[] {
  const rnd = mulberry32(42)
  const regions = ['North', 'South', 'East', 'West']
  const products: [string, number][] = [
    ['Widget A', 24.5],
    ['Widget B', 39],
    ['Gadget X', 120],
    ['Gadget Y', 89.9],
    ['Service Plan', 15],
  ]
  const channels = ['Online', 'Retail', 'Partner']
  const start = Date.UTC(2025, 0, 1)
  const rows: Row[] = []
  for (let i = 0; i < 240; i++) {
    const date = new Date(start + i * 86400000).toISOString().slice(0, 10)
    const [product, price] = products[Math.floor(rnd() * products.length)]
    const season = 1 + 0.35 * Math.sin((i / 240) * Math.PI * 2)
    let units = Math.round((8 + rnd() * 40) * season)
    if (i === 57 || i === 181) units *= 6 // planted outliers for the anomaly demo
    rows.push({
      Date: date,
      Region: regions[Math.floor(rnd() * regions.length)],
      Product: product,
      Channel: channels[Math.floor(rnd() * channels.length)],
      Revenue: round2(units * price),
      Units: units,
      'Unit Price': price,
    })
  }
  return rows
}

function buildMonthly(sales: Row[]): Row[] {
  const months = new Map<string, { rev: number; units: number; n: number; byProduct: Map<string, number> }>()
  for (const r of sales) {
    const key = String(r.Date).slice(0, 7) + '-01'
    const m = months.get(key) ?? { rev: 0, units: 0, n: 0, byProduct: new Map() }
    m.rev += r.Revenue as number
    m.units += r.Units as number
    m.n += 1
    m.byProduct.set(String(r.Product), (m.byProduct.get(String(r.Product)) ?? 0) + (r.Revenue as number))
    months.set(key, m)
  }
  return [...months.entries()].map(([month, m]) => ({
    Month: month,
    Revenue: round2(m.rev),
    Units: m.units,
    Orders: m.n,
    'Avg Order Value': round2(m.rev / m.n),
    'Top Product': [...m.byProduct.entries()].sort((a, b) => b[1] - a[1])[0][0],
  }))
}

function buildRegionSummary(sales: Row[]): Row[] {
  const agg = new Map<string, { rev: number; units: number; n: number }>()
  for (const r of sales) {
    const k = String(r.Region)
    const a = agg.get(k) ?? { rev: 0, units: 0, n: 0 }
    a.rev += r.Revenue as number
    a.units += r.Units as number
    a.n += 1
    agg.set(k, a)
  }
  return [...agg.entries()].map(([region, a]) => ({
    Region: region,
    'Total Revenue': round2(a.rev),
    'Total Units': a.units,
    'Orders': a.n,
    'Avg Order Value': round2(a.rev / a.n),
  }))
}

function buildMarketing(): Row[] {
  const rnd = mulberry32(7)
  const channels = ['Email', 'Social', 'Search', 'Display']
  const rows: Row[] = []
  for (let i = 1; i <= 36; i++) {
    const channel = channels[i % channels.length]
    const spend = round2(800 + rnd() * 9200)
    const impressions = Math.round(spend * (40 + rnd() * 60))
    const clicks = Math.round(impressions * (0.01 + rnd() * 0.04))
    rows.push({
      Campaign: `Campaign ${String(i).padStart(2, '0')}`,
      Channel: channel,
      'Start Date': new Date(Date.UTC(2025, 0, 1) + i * 6 * 86400000).toISOString().slice(0, 10),
      Spend: spend,
      Impressions: impressions,
      Clicks: clicks,
      Conversions: Math.round(clicks * (0.02 + rnd() * 0.08)),
    })
  }
  return rows
}

function buildHeadcount(): Row[] {
  const rnd = mulberry32(99)
  const departments: [string, number][] = [
    ['Engineering', 40],
    ['Sales', 25],
    ['Support', 18],
    ['Finance', 8],
    ['Operations', 14],
  ]
  const rows: Row[] = []
  for (const [dept, base] of departments) {
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
      const headcount = base + Math.round(rnd() * 6)
      rows.push({
        Department: dept,
        Quarter: `${q} 2025`,
        Headcount: headcount,
        Budget: round2(headcount * (18000 + rnd() * 6000)),
        'Attrition Rate': round2(1 + rnd() * 7),
      })
    }
  }
  return rows
}

export interface SeedState {
  workbooks: DemoWorkbook[]
  sheets: DemoSheet[]
  dashboards: DemoDashboard[]
}

const ts = (d: string) => `${d}T09:00:00Z`

export function buildSeed(): SeedState {
  const sales = buildSales()
  const defs: { wb: Omit<DemoWorkbook, 'sheet_count' | 'row_count'>; sheets: [string, Row[]][] }[] = [
    {
      wb: {
        id: 'demo-wb-sales',
        name: 'Sales Performance 2025',
        file_name: 'sales_performance_2025.xlsx',
        file_size: 48213,
        status: 'ready',
        meta: {
          insights: [
            'Revenue follows a seasonal curve, peaking around mid-year before tapering off.',
            'Gadget X is the top revenue driver despite lower unit volume than Widget A.',
            'Two unusually large orders (rows 58 and 182) are flagged as statistical outliers.',
          ],
        },
        created_at: ts('2025-09-01'),
        updated_at: ts('2025-09-01'),
      },
      sheets: [
        ['Monthly Summary', buildMonthly(sales)],
        ['Daily Sales', sales],
        ['Regional Summary', buildRegionSummary(sales)],
      ],
    },
    {
      wb: {
        id: 'demo-wb-marketing',
        name: 'Marketing Campaigns',
        file_name: 'marketing_campaigns.xlsx',
        file_size: 21877,
        status: 'ready',
        meta: { insights: ['Search campaigns convert best per dollar spent.', 'Display has the highest reach but the lowest click rate.'] },
        created_at: ts('2025-09-12'),
        updated_at: ts('2025-09-12'),
      },
      sheets: [['Campaigns', buildMarketing()]],
    },
    {
      wb: {
        id: 'demo-wb-headcount',
        name: 'Headcount Plan',
        file_name: 'headcount_plan.xlsx',
        file_size: 12044,
        status: 'ready',
        meta: { insights: ['Engineering carries the largest budget share across all quarters.'] },
        created_at: ts('2025-10-03'),
        updated_at: ts('2025-10-03'),
      },
      sheets: [['Plan', buildHeadcount()]],
    },
  ]

  const workbooks: DemoWorkbook[] = []
  const sheets: DemoSheet[] = []
  for (const d of defs) {
    let total = 0
    d.sheets.forEach(([name, data], index) => {
      const columns = inferColumns(data)
      sheets.push({
        id: `${d.wb.id}-sheet-${index + 1}`,
        workbook_id: d.wb.id,
        name,
        index,
        row_count: data.length,
        col_count: columns.length,
        columns,
        summary: null,
        created_at: d.wb.created_at,
        data,
      })
      total += data.length
    })
    workbooks.push({ ...d.wb, sheet_count: d.sheets.length, row_count: total })
  }

  const salesSheet = 'demo-wb-sales-sheet-1' // Monthly Summary (small enough to chart readably)
  const dashboards: DemoDashboard[] = [
    {
      id: 'demo-dash-sales',
      workbook_id: 'demo-wb-sales',
      user_id: 'demo-user-0001',
      name: 'Sales Overview',
      layout: [
        { i: 'c1', x: 0, y: 0, w: 6, h: 4, chart_type: 'line', x_key: 'Month', y_key: 'Revenue', title: 'Revenue over time', sheet_id: salesSheet },
        { i: 'c2', x: 6, y: 0, w: 6, h: 4, chart_type: 'bar', x_key: 'Month', y_key: 'Units', title: 'Units sold per month', sheet_id: salesSheet },
        { i: 'c3', x: 0, y: 4, w: 6, h: 4, chart_type: 'pie', x_key: 'Top Product', y_key: 'Rows', title: 'Months led by each product', sheet_id: salesSheet, transform: 'value_counts', column: 'Top Product' },
      ],
      is_public: false,
      share_token: null,
      created_at: ts('2025-09-02'),
      updated_at: ts('2025-09-02'),
    },
  ]

  return { workbooks, sheets, dashboards }
}
