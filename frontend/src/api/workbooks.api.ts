import { apiClient } from './client'
import type { WorkbookList, Workbook, Sheet, SheetData, SheetQueryResult } from '@/types/workbook.types'

export const workbooksApi = {
  list: () =>
    apiClient.get<WorkbookList>('/workbooks').then(r => r.data),

  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post<Workbook>('/workbooks/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }).then(r => r.data)
  },

  get: (id: string) =>
    apiClient.get<Workbook>(`/workbooks/${id}`).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/workbooks/${id}`),

  sheets: (workbookId: string) =>
    apiClient.get<Sheet[]>(`/workbooks/${workbookId}/sheets`).then(r => r.data),

  sheetData: (sheetId: string, page = 1, pageSize = 100) =>
    apiClient.get<SheetData>(`/sheets/${sheetId}/data`, { params: { page, page_size: pageSize } }).then(r => r.data),

  querySheet: (sheetId: string, params: Record<string, string | number>) =>
    apiClient.get<SheetQueryResult>(`/sheets/${sheetId}/query`, { params }).then(r => r.data),
}
