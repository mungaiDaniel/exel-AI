import { apiClient } from './client'

export const formulasApi = {
  evaluate: (expression: string, context: Record<string, unknown> = {}, sheetId?: string) =>
    apiClient.post('/formulas/evaluate', { expression, context, sheet_id: sheetId }).then(r => r.data),

  explain: (expression: string) =>
    apiClient.post('/formulas/explain', { expression }).then(r => r.data),

  history: () =>
    apiClient.get('/formulas/history').then(r => r.data),
}
