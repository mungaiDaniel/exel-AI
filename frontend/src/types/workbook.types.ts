export interface ColumnInfo {
  name: string
  type: 'number' | 'currency' | 'text' | 'datetime'
  nullable: boolean
  unique_count: number
  sample_values: unknown[]
}

export interface Sheet {
  id: string
  workbook_id: string
  name: string
  index: number
  row_count: number
  col_count: number
  columns: ColumnInfo[]
  summary: string | null
  created_at: string
}

export interface SheetData {
  sheet_id: string
  data: Record<string, unknown>[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface Workbook {
  id: string
  name: string
  file_name: string
  file_size: number
  status: 'processing' | 'ready' | 'error'
  sheet_count: number
  row_count: number
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface WorkbookList {
  items: Workbook[]
  total: number
}

export interface SheetQueryResult {
  data: Record<string, unknown>[]
  total: number
  limit: number
  offset: number
  has_more: boolean
  columns: ColumnInfo[]
  sheet_name: string
}
