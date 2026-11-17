import { apiClient } from './client'

export const exportApi = {
  csv: async (sheetId: string, filename = 'export.csv') => {
    const res = await apiClient.post(`/export/csv/${sheetId}`, {}, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  },

  pdf: async (sheetId: string, filename = 'export.pdf') => {
    const res = await apiClient.post(`/export/pdf/${sheetId}`, {}, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  },

  chartPng: async (elementId: string, filename = 'chart.png') => {
    const { default: html2canvas } = await import('html2canvas')
    const el = document.getElementById(elementId)
    if (!el) return
    const canvas = await html2canvas(el, { backgroundColor: '#1A1D27', scale: 2 })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = filename; a.click()
  },
}
