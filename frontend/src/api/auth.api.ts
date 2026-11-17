import { apiClient } from './client'

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { email: string; name: string; password: string }

export const authApi = {
  login:    (data: LoginPayload)    => apiClient.post('/auth/login', data).then(r => r.data),
  register: (data: RegisterPayload) => apiClient.post('/auth/register', data).then(r => r.data),
  me:       ()                      => apiClient.get('/auth/me').then(r => r.data),
  refresh:  (token: string)         => apiClient.post('/auth/refresh', { refresh_token: token }).then(r => r.data),
}
