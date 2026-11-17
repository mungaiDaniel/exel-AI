import axios from 'axios'
import { DEMO_MODE } from '@/demo/config'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Demo mode: answer every request from the in-memory mock (lazy-loaded; no network).
  ...(DEMO_MODE && {
    adapter: (config: Parameters<typeof import('@/demo/adapter').demoAdapter>[0]) =>
      import('@/demo/adapter').then(m => m.demoAdapter(config)),
  }),
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return apiClient.request(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)
