import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { clearCookies } from '@/test-utils/cookies'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient, refreshSession, setUnauthorizedHandler } from './api-client'

const DAY = 24 * 3600 * 1000
const session = (n: number) => ({
  token: `access-${n}`,
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 14 * DAY).toISOString(),
  refreshToken: `refresh-${n}`,
  refreshExpiresAt: new Date(Date.now() + 30 * DAY).toISOString(),
  admin: { id: 'a', name: 'A', email: 'a@b.com', role: 'ADMIN' },
})

const reply = (
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown
): Promise<AxiosResponse> => {
  const response = { status, statusText: '', data, headers: {}, config }
  if (status >= 400) {
    return Promise.reject(
      new AxiosError('fail', String(status), config, null, response)
    )
  }
  return Promise.resolve(response)
}

/** Fake server: /admin/clients needs a valid access token; /refresh rotates */
function fakeServer() {
  let current = 1
  const calls = { refresh: 0, clients: [] as string[] }
  const adapter: AxiosAdapter = async (config) => {
    if (config.url?.endsWith('/admin/auth/refresh')) {
      calls.refresh++
      await new Promise((r) => setTimeout(r, 10))
      const { refreshToken } = JSON.parse(config.data as string)
      if (refreshToken !== `refresh-${current}`) return reply(config, 401, {})
      current++
      return reply(config, 200, { success: true, data: session(current) })
    }
    const auth = String(config.headers?.Authorization ?? '')
    calls.clients.push(auth)
    return auth === `Bearer access-${current}`
      ? reply(config, 200, { success: true, data: [] })
      : reply(config, 401, { success: false })
  }
  return { adapter, calls }
}

describe('apiClient session refresh', () => {
  const originalApiAdapter = apiClient.defaults.adapter
  const originalAxiosAdapter = axios.defaults.adapter
  const onUnauthorized = vi.fn()

  beforeEach(() => {
    clearCookies()
    useAuthStore.getState().auth.reset()
    // The access token has expired on the server; the refresh token is valid
    useAuthStore.getState().auth.setSession({
      ...session(1),
      token: 'access-expired',
    })
    setUnauthorizedHandler(onUnauthorized)
    onUnauthorized.mockReset()
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalApiAdapter
    axios.defaults.adapter = originalAxiosAdapter
  })

  const install = () => {
    const server = fakeServer()
    apiClient.defaults.adapter = server.adapter
    axios.defaults.adapter = server.adapter
    return server
  }

  it('refreshes once on 401 and retries the request with the new token', async () => {
    const server = install()
    const res = await apiClient.get('/admin/clients')
    expect(res.status).toBe(200)
    expect(server.calls.refresh).toBe(1)
    expect(server.calls.clients).toEqual([
      'Bearer access-expired',
      'Bearer access-2',
    ])
    expect(useAuthStore.getState().auth.refreshToken).toBe('refresh-2')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('parallel requests share a single refresh', async () => {
    const server = install()
    const results = await Promise.all(
      Array.from({ length: 4 }, () => apiClient.get('/admin/clients'))
    )
    expect(results.every((r) => r.status === 200)).toBe(true)
    expect(server.calls.refresh).toBe(1)
  })

  it('an expired refresh token signs out', async () => {
    const server = install()
    useAuthStore.getState().auth.setSession({
      ...session(1),
      token: 'access-expired',
      refreshToken: 'refresh-stale',
    })
    await expect(apiClient.get('/admin/clients')).rejects.toBeInstanceOf(
      AxiosError
    )
    expect(server.calls.refresh).toBe(1)
    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.refreshToken).toBe('')
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('refreshSession returns null without a refresh token', async () => {
    install()
    useAuthStore.getState().auth.reset()
    await expect(refreshSession()).resolves.toBeNull()
  })

  it('a wrong password at login is not treated as an expired session', async () => {
    const server = install()
    apiClient.defaults.adapter = (config) => reply(config, 401, {})
    await expect(
      apiClient.post('/admin/auth/login', { email: 'a', password: 'b' })
    ).rejects.toBeInstanceOf(AxiosError)
    expect(server.calls.refresh).toBe(0)
    expect(useAuthStore.getState().auth.refreshToken).toBe('refresh-1')
  })
})
