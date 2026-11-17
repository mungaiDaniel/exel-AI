/**
 * In-memory stand-in for the FastAPI backend (demo mode only).
 *
 * `handleRequest` mirrors the REST contract in backend/app/api/v1/*. State lives in module
 * memory, so create/edit/delete feel real during a session and reset on page reload.
 */
import { DEMO_ACCESS_TOKEN, DEMO_REFRESH_TOKEN, DEMO_USER } from './config'
import { evaluateFormula, explainFormula } from './formulas'
import { buildSeed, inferColumns, type DemoDashboard, type DemoSheet, type DemoWorkbook, type Row } from './seed'

export interface MockResponse {
  status: number
  data: unknown
}

export interface MockRequest {
  method: string
  path: string
  params: Record<string, string>
  body: unknown
}

const state = buildSeed()
const formulaHistory: Record<string, unknown>[] = []
const chatHistory: Record<string, { id: string; role: string; content: string; metadata_: object; created_at: string }[]> = {}
let counter = 0
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`
const now = () => new Date().toISOString()

const ok = (data: unknown, status = 200): MockResponse => ({ status, data })
const fail = (status: number, detail: string): MockResponse => ({ status, data: { detail } })

const userOut = (name: string = DEMO_USER.name, email: string = DEMO_USER.email) => ({
  id: DEMO_USER.id,
  email,
  name,
  provider: 'demo',
  avatar_url: null,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
})

const tokens = (name?: string, email?: string) => ({
  access_token: DEMO_ACCESS_TOKEN,
  refresh_token: DEMO_REFRESH_TOKEN,
  token_type: 'bearer',
  user: userOut(name, email),
})

const stripData = ({ data: _data, ...sheet }: DemoSheet) => sheet
const sheetsOf = (workbookId: string) => state.sheets.filter(s => s.workbook_id === workbookId)
const toNum = (v: unknown) => (typeof v === 'number' ? v : Number(v))

// ── Sheet querying (mirrors GET /sheets/{id}/query) ───────────────────────────

function querySheet(sheet: DemoSheet, params: Record<string, string>) {
  const p = { ...params }
  const limit = Math.min(parseInt(p.limit ?? '500', 10) || 500, 5000)
  const offset = Math.max(parseInt(p.offset ?? '0', 10) || 0, 0)
  const sortBy = p.sort_by
  const desc = (p.sort_dir ?? 'asc').toLowerCase() === 'desc'
  const q = (p.q ?? '').trim().toLowerCase()
  for (const k of ['limit', 'offset', 'sort_by', 'sort_dir', 'q']) delete p[k]

  let rows = [...sheet.data]
  if (q) rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)))

  for (const [param, value] of Object.entries(p)) {
    if (!value) continue
    const suffix = ['_gte', '_lte', '_gt', '_lt', '_like', '_in'].find(s => param.endsWith(s))
    const col = suffix ? param.slice(0, -suffix.length) : param
    const num = Number(value)
    const cmp: Record<string, (v: number) => boolean> = {
      _gte: v => v >= num, _lte: v => v <= num, _gt: v => v > num, _lt: v => v < num,
    }
    if (suffix && cmp[suffix]) {
      if (!Number.isNaN(num)) rows = rows.filter(r => r[col] != null && cmp[suffix](toNum(r[col])))
    } else if (suffix === '_like') {
      rows = rows.filter(r => String(r[col] ?? '').toLowerCase().includes(value.toLowerCase()))
    } else if (suffix === '_in') {
      const set = new Set(value.split(',').map(s => s.trim()))
      rows = rows.filter(r => set.has(String(r[col] ?? '')))
    } else {
      rows = rows.filter(r => String(r[col] ?? '').toLowerCase() === value.toLowerCase())
    }
  }

  const colType = sheet.columns.find(c => c.name === sortBy)?.type
  if (sortBy && colType) {
    const numeric = colType === 'number' || colType === 'currency'
    rows.sort((a, b) => {
      const x = numeric ? toNum(a[sortBy]) : String(a[sortBy] ?? '').toLowerCase()
      const y = numeric ? toNum(b[sortBy]) : String(b[sortBy] ?? '').toLowerCase()
      return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1)
    })
  }

  return {
    data: rows.slice(offset, offset + limit),
    total: rows.length,
    limit,
    offset,
    has_more: offset + limit < rows.length,
    columns: sheet.columns,
    sheet_name: sheet.name,
  }
}

// ── Charts & anomalies ────────────────────────────────────────────────────────

function suggestCharts(sheet: DemoSheet) {
  const numeric = sheet.columns.filter(c => c.type === 'number' || c.type === 'currency')
  const dates = sheet.columns.filter(c => c.type === 'datetime')
  const cats = sheet.columns.filter(c => c.type === 'text' && c.unique_count > 1 && c.unique_count <= 12)
  const out: Record<string, unknown>[] = []
  const y = numeric[numeric.length - 1]
  if (dates[0] && y) {
    out.push({ chart_type: 'line', x: dates[0].name, y: y.name, title: `${y.name} over time`, reasoning: 'A date column and a numeric column suggest a trend.' })
  }
  if (cats[0] && y) {
    out.push({ chart_type: 'bar', x: cats[0].name, y: y.name, title: `${y.name} by ${cats[0].name}`, reasoning: 'Compares a numeric measure across categories.' })
  }
  if (cats[1]) {
    out.push({ chart_type: 'pie', x: cats[1].name, y: 'Rows', title: `${cats[1].name} distribution`, reasoning: 'Few distinct categories work well as a share-of-total.', transform: 'value_counts', column: cats[1].name })
  }
  if (numeric.length >= 2) {
    out.push({ chart_type: 'scatter', x: numeric[0].name, y: numeric[1].name, title: `${numeric[0].name} vs ${numeric[1].name}`, reasoning: 'Two numeric columns can reveal correlation.' })
  }
  return out
}

function detectAnomalies(sheet: DemoSheet) {
  const out: Record<string, unknown>[] = []
  for (const col of sheet.columns.filter(c => c.type === 'number' || c.type === 'currency')) {
    const vals = sheet.data.map(r => toNum(r[col.name])).filter(v => !Number.isNaN(v))
    if (vals.length < 4) continue
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    const stdev = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1))
    if (!stdev) continue
    sheet.data.forEach((r, i) => {
      const v = toNum(r[col.name])
      const z = Math.abs((v - mean) / stdev)
      if (z > 2.5) {
        out.push({
          column: col.name, row_index: i, value: v, z_score: Math.round(z * 100) / 100,
          mean: Math.round(mean * 100) / 100, stdev: Math.round(stdev * 100) / 100,
          severity: z > 3.5 ? 'high' : 'medium',
        })
      }
    })
  }
  return out.sort((a, b) => (b.z_score as number) - (a.z_score as number)).slice(0, 20)
}

// ── Chat (canned, data-aware replies) ─────────────────────────────────────────

export function generateChatReply(workbookId: string | null | undefined, text: string): string {
  // Use the largest sheet: it is the most useful one to ask questions about.
  const sheet = workbookId ? [...sheetsOf(workbookId)].sort((a, b) => b.row_count - a.row_count)[0] : undefined
  const t = text.toLowerCase()
  if (!sheet) {
    return 'Demo mode: select a workbook and ask about its data. In the full app, answers come from Claude using your sheet as context.'
  }
  const numeric = sheet.columns.filter(c => c.type === 'number' || c.type === 'currency')
  const cat = sheet.columns.find(c => c.type === 'text' && c.unique_count <= 12)
  const measure = numeric.find(c => t.includes(c.name.toLowerCase())) ?? numeric[numeric.length - 1]

  if (measure && cat && /(top|best|highest|most|lead|which)/.test(t)) {
    const totals = new Map<string, number>()
    for (const r of sheet.data) totals.set(String(r[cat.name]), (totals.get(String(r[cat.name])) ?? 0) + toNum(r[measure.name]))
    const [name, value] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0]
    return `By total ${measure.name}, the leading ${cat.name} is ${name} at ${Math.round(value).toLocaleString()}.\n\n(Demo mode: computed locally from the sample data, not by an AI model.)`
  }
  if (measure && /(total|sum|how much)/.test(t)) {
    const total = sheet.data.reduce((a, r) => a + toNum(r[measure.name]), 0)
    return `The total ${measure.name} across ${sheet.row_count} rows in "${sheet.name}" is ${Math.round(total).toLocaleString()}.\n\n(Demo mode: computed locally from the sample data.)`
  }
  if (measure && /(average|avg|mean)/.test(t)) {
    const avg = sheet.data.reduce((a, r) => a + toNum(r[measure.name]), 0) / sheet.data.length
    return `The average ${measure.name} is ${avg.toFixed(2)}.\n\n(Demo mode: computed locally from the sample data.)`
  }
  return `"${sheet.name}" has ${sheet.row_count} rows and ${sheet.col_count} columns (${sheet.columns.map(c => c.name).join(', ')}). Try asking "What is the total ${measure?.name ?? 'value'}?" or "Which ${cat?.name ?? 'category'} is highest?".\n\n(Demo mode: replies are generated locally, not by an AI model.)`
}

// ── Upload (CSV is parsed in the browser; other formats get sample data) ─────

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const split = (l: string) => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''))
  const headers = split(lines[0])
  return lines.slice(1, 1001).map(l => {
    const cells = split(l)
    return Object.fromEntries(headers.map((h, i) => {
      const raw = cells[i] ?? ''
      return [h, raw === '' ? null : Number.isNaN(Number(raw)) ? raw : Number(raw)]
    }))
  })
}

async function upload(body: unknown): Promise<MockResponse> {
  const file = body instanceof FormData ? (body.get('file') as File | null) : null
  if (!file) return fail(422, 'No file provided')
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['xlsx', 'xls', 'xlsm', 'csv'].includes(ext)) return fail(400, `File type .${ext} not supported. Use .xlsx, .xls, .xlsm or .csv`)

  let rows: Row[] = []
  let insight = 'Demo mode: your file is not uploaded anywhere. This sample dataset stands in for its contents.'
  if (ext === 'csv') {
    rows = parseCsv(await file.text())
    insight = `Parsed ${rows.length} rows locally in your browser — nothing was sent to a server.`
  }
  if (!rows.length) rows = state.sheets[0].data.slice(0, 60)

  const wbId = newId('demo-wb')
  const columns = inferColumns(rows)
  const created = now()
  const wb: DemoWorkbook = {
    id: wbId,
    name: file.name.replace(/\.[^.]+$/, ''),
    file_name: file.name,
    file_size: file.size,
    status: 'ready',
    sheet_count: 1,
    row_count: rows.length,
    meta: { insights: [insight] },
    created_at: created,
    updated_at: created,
  }
  state.workbooks.unshift(wb)
  state.sheets.push({
    id: `${wbId}-sheet-1`, workbook_id: wbId, name: 'Sheet1', index: 0, row_count: rows.length,
    col_count: columns.length, columns, summary: null, created_at: created, data: rows,
  })
  return ok(wb, 201)
}

// ── Minimal single-page PDF (so the "Export PDF" button works offline) ───────

function buildPdf(title: string, lines: string[]): Blob {
  const esc = (s: string) => s.replace(/[\\()]/g, '\\$&')
  const body = ['BT /F1 14 Tf 40 780 Td (' + esc(title) + ') Tj ET']
  lines.slice(0, 45).forEach((l, i) => body.push(`BT /F1 8 Tf 40 ${755 - i * 14} Td (${esc(l.slice(0, 110))}) Tj ET`))
  const stream = body.join('\n')
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

const toCsv = (sheet: DemoSheet) => {
  const cols = sheet.columns.map(c => c.name)
  const cell = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  return [cols.join(','), ...sheet.data.map(r => cols.map(c => cell(r[c])).join(','))].join('\n')
}

// ── Router ────────────────────────────────────────────────────────────────────

type Handler = (m: RegExpExecArray, req: MockRequest) => MockResponse | Promise<MockResponse>
const routes: [string, RegExp, Handler][] = []
const route = (method: string, pattern: string, h: Handler) =>
  routes.push([method, new RegExp(`^${pattern}$`), h])

const body = (req: MockRequest) => (req.body ?? {}) as Record<string, unknown>

// Auth — any credentials work in demo mode.
route('POST', '/auth/login', (_m, req) => ok(tokens(undefined, String(body(req).email ?? DEMO_USER.email))))
route('POST', '/auth/register', (_m, req) => ok(tokens(String(body(req).name ?? DEMO_USER.name), String(body(req).email ?? DEMO_USER.email)), 201))
route('POST', '/auth/refresh', () => ok(tokens()))
route('GET', '/auth/me', () => ok(userOut()))

// Workbooks & sheets
route('GET', '/workbooks', () => ok({ items: state.workbooks, total: state.workbooks.length }))
route('POST', '/workbooks/upload', (_m, req) => upload(req.body))
route('GET', '/workbooks/([^/]+)', m => { const wb = state.workbooks.find(w => w.id === m[1]); return wb ? ok(wb) : fail(404, 'Workbook not found') })
route('DELETE', '/workbooks/([^/]+)', m => {
  if (!state.workbooks.some(w => w.id === m[1])) return fail(404, 'Workbook not found')
  state.workbooks = state.workbooks.filter(w => w.id !== m[1])
  state.sheets = state.sheets.filter(s => s.workbook_id !== m[1])
  state.dashboards = state.dashboards.filter(d => d.workbook_id !== m[1])
  return ok(null, 204)
})
route('GET', '/workbooks/([^/]+)/sheets', m => ok(sheetsOf(m[1]).map(stripData)))
route('GET', '/sheets/([^/]+)', m => { const s = state.sheets.find(x => x.id === m[1]); return s ? ok(stripData(s)) : fail(404, 'Sheet not found') })
route('GET', '/sheets/([^/]+)/data', (m, req) => {
  const s = state.sheets.find(x => x.id === m[1])
  if (!s) return fail(404, 'Sheet not found')
  const page = Math.max(parseInt(req.params.page ?? '1', 10) || 1, 1)
  const size = Math.min(Math.max(parseInt(req.params.page_size ?? '100', 10) || 100, 1), 1000)
  const start = (page - 1) * size
  return ok({ sheet_id: s.id, data: s.data.slice(start, start + size), total: s.data.length, page, page_size: size, has_more: start + size < s.data.length })
})
route('GET', '/sheets/([^/]+)/query', (m, req) => { const s = state.sheets.find(x => x.id === m[1]); return s ? ok(querySheet(s, req.params)) : fail(404, 'Sheet not found') })

// Charts, anomalies
route('POST', '/charts/suggest', (_m, req) => { const s = state.sheets.find(x => x.id === body(req).sheet_id); return s ? ok(suggestCharts(s)) : fail(404, 'Sheet not found') })
route('GET', '/anomalies/([^/]+)', (m, req) => {
  const s = state.sheets.find(x => x.id === m[1])
  if (!s) return fail(404, 'Sheet not found')
  const anomalies = detectAnomalies(s)
  const explain = req.params.explain !== 'false'
  return ok({
    sheet_id: s.id, sheet_name: s.name, anomaly_count: anomalies.length, anomalies,
    explanation: explain && anomalies.length
      ? `Found ${anomalies.length} statistical outlier(s) with a z-score above 2.5. These are unusually far from the column average and are worth verifying. (Demo mode: generated locally, not by an AI model.)`
      : '',
  })
})

// Formulas
route('POST', '/formulas/evaluate', (_m, req) => {
  const b = body(req)
  const result = evaluateFormula(String(b.expression ?? ''), (b.context ?? {}) as Record<string, number>)
  formulaHistory.unshift({ id: newId('f'), expression: result.expression, result, explanation: null, created_at: now() })
  return ok(result)
})
route('POST', '/formulas/explain', (_m, req) => ok({ expression: body(req).expression, explanation: explainFormula(String(body(req).expression ?? '')) }))
route('GET', '/formulas/history', () => ok(formulaHistory.slice(0, 50)))

// Dashboards
const findDash = (id: string) => state.dashboards.find(d => d.id === id)
route('GET', '/dashboards', () => ok([...state.dashboards].sort((a, b) => b.updated_at.localeCompare(a.updated_at))))
route('POST', '/dashboards', (_m, req) => {
  const b = body(req)
  const name = String(b.name ?? '').trim()
  if (!name) return fail(422, 'Validation failed')
  if (!state.workbooks.some(w => w.id === b.workbook_id)) return fail(404, 'Workbook not found')
  const t = now()
  const d: DemoDashboard = {
    id: newId('demo-dash'), workbook_id: String(b.workbook_id), user_id: DEMO_USER.id, name,
    layout: (b.layout as Record<string, unknown>[]) ?? [], is_public: false, share_token: null, created_at: t, updated_at: t,
  }
  state.dashboards.unshift(d)
  return ok(d, 201)
})
route('GET', '/dashboards/shared/([^/]+)', m => { const d = state.dashboards.find(x => x.share_token === m[1] && x.is_public); return d ? ok(d) : fail(404, 'Shared dashboard not found or access revoked') })
route('GET', '/dashboards/([^/]+)', m => { const d = findDash(m[1]); return d ? ok(d) : fail(404, 'Dashboard not found') })
route('PUT', '/dashboards/([^/]+)', (m, req) => {
  const d = findDash(m[1])
  if (!d) return fail(404, 'Dashboard not found')
  const b = body(req)
  if (typeof b.name === 'string' && b.name.trim()) d.name = b.name.trim()
  if (Array.isArray(b.layout)) d.layout = b.layout
  if (typeof b.is_public === 'boolean') d.is_public = b.is_public
  d.updated_at = now()
  return ok(d)
})
route('DELETE', '/dashboards/([^/]+)', m => {
  if (!findDash(m[1])) return fail(404, 'Dashboard not found')
  state.dashboards = state.dashboards.filter(d => d.id !== m[1])
  return ok(null, 204)
})
route('POST', '/dashboards/([^/]+)/share', m => {
  const d = findDash(m[1])
  if (!d) return fail(404, 'Dashboard not found')
  d.share_token ??= newId('share')
  d.is_public = true
  return ok({ share_token: d.share_token, url: `/shared/${d.share_token}` })
})
route('DELETE', '/dashboards/([^/]+)/share', m => {
  const d = findDash(m[1])
  if (!d) return fail(404, 'Dashboard not found')
  d.share_token = null
  d.is_public = false
  return ok(null, 204)
})

// Export
route('POST', '/export/csv/([^/]+)', m => { const s = state.sheets.find(x => x.id === m[1]); return s ? ok(new Blob([toCsv(s)], { type: 'text/csv' })) : fail(404, 'Sheet not found') })
route('POST', '/export/pdf/([^/]+)', m => {
  const s = state.sheets.find(x => x.id === m[1])
  if (!s) return fail(404, 'Sheet not found')
  const cols = s.columns.map(c => c.name)
  return ok(buildPdf(`${s.name} (demo export)`, [cols.join(' | '), ...s.data.slice(0, 40).map(r => cols.map(c => String(r[c] ?? '')).join(' | '))]))
})

// Chat
route('POST', '/chat/message', (_m, req) => {
  const b = body(req)
  const wb = (b.workbook_id as string | undefined) ?? null
  const reply = { id: newId('msg'), role: 'assistant', content: generateChatReply(wb, String(b.content ?? '')), metadata_: {}, created_at: now() }
  const key = wb ?? '_'
  chatHistory[key] = [...(chatHistory[key] ?? []), { id: newId('msg'), role: 'user', content: String(b.content ?? ''), metadata_: {}, created_at: now() }, reply]
  return ok(reply)
})
route('GET', '/chat/history/([^/]+)', m => ok({ messages: chatHistory[m[1]] ?? [], workbook_id: m[1] }))

// Search
route('GET', '/search', (_m, req) => {
  const term = (req.params.q ?? '').trim().toLowerCase()
  if (!term) return fail(422, 'Validation failed')
  const workbooks = state.workbooks.filter(w => w.name.toLowerCase().includes(term)).slice(0, 5)
    .map(w => ({ id: w.id, name: w.name, file_name: w.file_name, sheet_count: w.sheet_count, row_count: w.row_count, match: 'name' }))
  const metaSheets = state.sheets.filter(s => s.name.toLowerCase().includes(term) || s.columns.some(c => c.name.toLowerCase().includes(term))).slice(0, 10)
  const metaIds = new Set(metaSheets.map(s => s.id))
  const sheets = metaSheets.map(s => ({
    id: s.id, workbook_id: s.workbook_id, name: s.name, row_count: s.row_count,
    matching_columns: s.columns.filter(c => c.name.toLowerCase().includes(term)).map(c => c.name),
    match: s.name.toLowerCase().includes(term) ? 'sheet' : 'column',
  }))
  const dataHits = state.sheets.filter(s => !metaIds.has(s.id)).flatMap(s => {
    const matches = s.data.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(term)))
    if (!matches.length) return []
    const sample = matches.slice(0, 3).map(r => Object.fromEntries(Object.entries(r).filter(([, v]) => String(v).toLowerCase().includes(term))))
    return [{ sheet_id: s.id, sheet_name: s.name, workbook_id: s.workbook_id, match_count: matches.length, sample_rows: sample }]
  }).slice(0, 8)
  return ok({ query: req.params.q, workbooks, sheets, data_hits: dataHits, total: workbooks.length + sheets.length + dataHits.length })
})

export async function handleRequest(req: MockRequest): Promise<MockResponse> {
  const method = req.method.toUpperCase()
  for (const [m, re, handler] of routes) {
    if (m !== method) continue
    const match = re.exec(req.path)
    if (match) return handler(match, req)
  }
  return fail(404, `Demo mode: no mock for ${method} ${req.path}`)
}
