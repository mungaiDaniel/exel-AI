import { apiClient } from './client'
import type { ChartSuggestion } from '@/types/chart.types'

export const chartsApi = {
  suggest: (sheetId: string) =>
    apiClient.post<ChartSuggestion[]>('/charts/suggest', { sheet_id: sheetId }).then(r => r.data),
}
