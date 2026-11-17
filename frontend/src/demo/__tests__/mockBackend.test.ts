import { describe, expect, it } from 'vitest'
import { evaluateFormula } from '../formulas'
import { handleRequest, type MockResponse } from '../mockBackend'

const call = (method: string, path: string, body?: unknown, params: Record<string, string> = {}): Promise<MockResponse> =>
  handleRequest({ method, path, params, body })

type Obj = Record<string, any>

describe('demo mock backend', () => {
  it('logs in with any credentials', async () => {
    const res = await call('POST', '/auth/login', { email: 'x@example.com', password: 'whatever' })
    expect(res.status).toBe(200)
    expect((res.data as Obj).access_token).toBeTruthy()
  })

  it('lists seeded workbooks and their sheets', async () => {
    const list = (await call('GET', '/workbooks')).data as Obj
    expect(list.total).toBeGreaterThanOrEqual(3)
    const sheets = (await call('GET', `/workbooks/${list.items[0].id}/sheets`)).data as Obj[]
    expect(sheets.length).toBeGreaterThan(0)
    expect(sheets[0]).not.toHaveProperty('data')
  })

  it('paginates and filters sheet data', async () => {
    const sheetId = 'demo-wb-sales-sheet-2'
    const page = (await call('GET', `/sheets/${sheetId}/data`, undefined, { page: '2', page_size: '50' })).data as Obj
    expect(page.data).toHaveLength(50)
    expect(page.total).toBe(240)
    const q = (await call('GET', `/sheets/${sheetId}/query`, undefined, { Region: 'north', sort_by: 'Revenue', sort_dir: 'desc', limit: '5' })).data as Obj
    expect(q.data.every((r: Obj) => r.Region === 'North')).toBe(true)
    expect(q.data[0].Revenue).toBeGreaterThanOrEqual(q.data[1].Revenue)
  })

  it('flags the planted outliers', async () => {
    const res = (await call('GET', '/anomalies/demo-wb-sales-sheet-2')).data as Obj
    expect(res.anomaly_count).toBeGreaterThan(0)
  })

  it('supports dashboard create / update / share / delete in memory', async () => {
    const created = await call('POST', '/dashboards', { workbook_id: 'demo-wb-sales', name: 'Mine' })
    expect(created.status).toBe(201)
    const id = (created.data as Obj).id
    expect(((await call('PUT', `/dashboards/${id}`, { name: 'Renamed' })).data as Obj).name).toBe('Renamed')
    const share = (await call('POST', `/dashboards/${id}/share`)).data as Obj
    expect((await call('GET', `/dashboards/shared/${share.share_token}`)).status).toBe(200)
    expect((await call('DELETE', `/dashboards/${id}`)).status).toBe(204)
    expect((await call('GET', `/dashboards/${id}`)).status).toBe(404)
  })

  it('validates dashboard input like the real API', async () => {
    expect((await call('POST', '/dashboards', { workbook_id: 'demo-wb-sales', name: '' })).status).toBe(422)
    expect((await call('POST', '/dashboards', { workbook_id: 'nope', name: 'x' })).status).toBe(404)
  })

  it('uploads a CSV, then deletes the workbook', async () => {
    const form = new FormData()
    form.append('file', new File(['name,score\nalpha,1\nbeta,2\n'], 'scores.csv', { type: 'text/csv' }))
    const up = await call('POST', '/workbooks/upload', form)
    expect(up.status).toBe(201)
    expect((up.data as Obj).row_count).toBe(2)
    expect((await call('DELETE', `/workbooks/${(up.data as Obj).id}`)).status).toBe(204)
  })

  it('rejects unsupported uploads', async () => {
    const form = new FormData()
    form.append('file', new File(['x'], 'bad.exe'))
    expect((await call('POST', '/workbooks/upload', form)).status).toBe(400)
  })

  it('searches workbooks, columns and data', async () => {
    const res = (await call('GET', '/search', undefined, { q: 'revenue' })).data as Obj
    expect(res.total).toBeGreaterThan(0)
  })

  it('answers chat questions from the sample data', async () => {
    const res = (await call('POST', '/chat/message', { content: 'Which region is highest?', workbook_id: 'demo-wb-sales' })).data as Obj
    expect(res.content).toMatch(/Demo mode/)
  })

  it('exports CSV and PDF blobs', async () => {
    const csv = (await call('POST', '/export/csv/demo-wb-sales-sheet-2')).data as Blob
    expect((await csv.text()).startsWith('Date,Region')).toBe(true)
    const pdf = (await call('POST', '/export/pdf/demo-wb-sales-sheet-2')).data as Blob
    expect((await pdf.text()).startsWith('%PDF')).toBe(true)
  })

  it('returns 404 for unknown routes', async () => {
    expect((await call('GET', '/nope')).status).toBe(404)
  })
})

describe('demo formula evaluator', () => {
  it.each([
    ['=SUM(1,2,3)', 6],
    ['=ROUND(3.14159,2)', 3.14],
    ['=IF(TRUE,"yes","no")', 'yes'],
    ['=UPPER("abc")', 'ABC'],
    ['=2+3*4', 14],
    ['=(2+3)*4', 20],
    ['=SUM(A,B)*2', 14],
  ])('%s', (expr, expected) => {
    const r = evaluateFormula(expr, { a: 3, b: 4 })
    expect(r.success).toBe(true)
    expect(r.result).toBe(expected)
  })

  it('reports errors instead of throwing', () => {
    expect(evaluateFormula('=NOPE(1)').success).toBe(false)
    expect(evaluateFormula('=1/0').success).toBe(false)
  })
})
