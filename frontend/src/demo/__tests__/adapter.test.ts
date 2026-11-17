// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('axios client in demo mode', () => {
  it('routes the real API modules through the mock with no network', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { authApi } = await import('@/api/auth.api')
    const { workbooksApi } = await import('@/api/workbooks.api')
    const { dashboardsApi } = await import('@/api/dashboards.api')

    const login = await authApi.login({ email: 'demo@example.com', password: 'x' })
    expect(login.user.email).toBe('demo@example.com')

    const list = await workbooksApi.list()
    expect(list.total).toBeGreaterThanOrEqual(3)

    const created = await dashboardsApi.create({ workbook_id: list.items[0].id, name: 'Adapter test' })
    expect((await dashboardsApi.list()).some(d => d.id === created.id)).toBe(true)
    await dashboardsApi.delete(created.id)

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces mock errors as axios errors with response.data.detail', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    const { workbooksApi } = await import('@/api/workbooks.api')
    await expect(workbooksApi.get('does-not-exist')).rejects.toMatchObject({
      response: { status: 404, data: { detail: 'Workbook not found' } },
    })
  })

  it('does not install the mock adapter when the flag is off', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    const { apiClient } = await import('@/api/client')
    expect(apiClient.defaults.adapter).not.toBeInstanceOf(Function)
  })
})
