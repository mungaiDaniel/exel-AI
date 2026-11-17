import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { handleRequest } from './mockBackend'

const LATENCY_MS = 250

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function parseBody(config: InternalAxiosRequestConfig): unknown {
  const { data } = config
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return data }
  }
  return data // FormData / undefined
}

/** Axios adapter that answers every request from the in-memory mock backend. */
export const demoAdapter: AxiosAdapter = async config => {
  await sleep(LATENCY_MS) // so spinners and skeletons behave realistically

  const path = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1/, '').split('?')[0]
  const params = Object.fromEntries(
    Object.entries(config.params ?? {}).map(([k, v]) => [k, String(v)]),
  )

  const { status, data } = await handleRequest({
    method: config.method ?? 'get',
    path,
    params,
    body: parseBody(config),
  })

  const response: AxiosResponse = { data, status, statusText: String(status), headers: {}, config, request: {} }
  if (status >= 400) {
    throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, {}, response)
  }
  return response
}
