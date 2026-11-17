import { apiClient } from './client'

export interface DataHit {
  sheet_id: string
  sheet_name: string
  workbook_id: string
  match_count: number
  sample_rows: Record<string, unknown>[]
}

export interface SearchResult {
  query: string
  workbooks: { id: string; name: string; file_name: string; sheet_count: number; row_count: number; match: string }[]
  sheets: { id: string; workbook_id: string; name: string; row_count: number; matching_columns: string[]; match: string }[]
  data_hits: DataHit[]
  total: number
}

export const searchApi = {
  search: (q: string) =>
    apiClient.get<SearchResult>('/search', { params: { q } }).then(r => r.data),
}
