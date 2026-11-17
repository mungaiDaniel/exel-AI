import { apiClient } from './client'

export interface Anomaly {
  column: string
  row_index: number
  value: number
  z_score: number
  mean: number
  stdev: number
  severity: 'high' | 'medium'
}

export interface AnomalyResult {
  sheet_id: string
  sheet_name: string
  anomaly_count: number
  anomalies: Anomaly[]
  explanation: string
}

export const anomaliesApi = {
  get: (sheetId: string, explain = true) =>
    apiClient.get<AnomalyResult>(`/anomalies/${sheetId}`, { params: { explain } }).then(r => r.data),
}
