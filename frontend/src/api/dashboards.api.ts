import { apiClient } from './client'

export interface DashboardCreate {
  workbook_id: string
  name: string
  layout?: LayoutItem[]
}

export interface LayoutItem {
  i: string
  x: number; y: number; w: number; h: number
  chart_type: string
  x_key?: string; y_key?: string; title?: string
  sheet_id?: string
  transform?: string
  column?: string
}

export interface Dashboard {
  id: string
  workbook_id: string
  user_id: string
  name: string
  layout: LayoutItem[]
  is_public: boolean
  share_token: string | null
  created_at: string
  updated_at: string
}

export const dashboardsApi = {
  list: () =>
    apiClient.get<Dashboard[]>('/dashboards').then(r => r.data),

  create: (data: DashboardCreate) =>
    apiClient.post<Dashboard>('/dashboards', data).then(r => r.data),

  get: (id: string) =>
    apiClient.get<Dashboard>(`/dashboards/${id}`).then(r => r.data),

  update: (id: string, data: Partial<{ name: string; layout: LayoutItem[]; is_public: boolean }>) =>
    apiClient.put<Dashboard>(`/dashboards/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/dashboards/${id}`),

  share: (id: string) =>
    apiClient.post<{ share_token: string; url: string }>(`/dashboards/${id}/share`).then(r => r.data),

  unshare: (id: string) =>
    apiClient.delete(`/dashboards/${id}/share`),

  getShared: (token: string) =>
    apiClient.get<Dashboard>(`/dashboards/shared/${token}`).then(r => r.data),
}
