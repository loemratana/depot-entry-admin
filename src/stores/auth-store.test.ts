import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setCookie } from '@/lib/cookies'

async function importAuthStore() {
  const { useAuthStore } = await import('./auth-store')
  return useAuthStore
}

const sampleUser = {
  id: 'admin-1',
  name: 'Administrator',
  email: 'admin@example.com',
  role: 'ADMIN',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    clearCookies()
    vi.resetModules()
  })

  it('starts with an empty access token when nothing is persisted', async () => {
    const useAuthStore = await importAuthStore()

    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.user).toBeNull()
  })

  it('persists access token so a new store instance reads it back', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.getState().auth.setAccessToken('session-token')

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.accessToken).toBe(
      'session-token'
    )
  })

  it('clears persisted access token when resetAccessToken is used', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.getState().auth.setAccessToken('to-clear')
    useAuthStore.getState().auth.resetAccessToken()

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.accessToken).toBe('')
  })

  it('updates the signed-in user via setUser', async () => {
    const useAuthStore = await importAuthStore()

    useAuthStore.getState().auth.setUser({ ...sampleUser })

    expect(useAuthStore.getState().auth.user).toEqual(sampleUser)
  })

  it('reset clears user and access token and drops persistence', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.getState().auth.setAccessToken('will-be-cleared')
    useAuthStore.getState().auth.setUser({ ...sampleUser })

    useAuthStore.getState().auth.reset()

    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(useAuthStore.getState().auth.accessToken).toBe('')

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.user).toBeNull()
    expect(useAuthStoreAfterReload.getState().auth.accessToken).toBe('')
  })
})

describe('useAuthStore sessions (access + refresh token)', () => {
  beforeEach(() => {
    clearCookies()
    vi.resetModules()
  })

  const session = {
    token: 'access-1',
    expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    refreshToken: 'refresh-1',
    refreshExpiresAt: new Date(
      Date.now() + 30 * 24 * 3600 * 1000
    ).toISOString(),
  }

  it('setSession persists both tokens; reset clears both', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.getState().auth.setSession(session)

    vi.resetModules()
    const reloaded = await importAuthStore()
    expect(reloaded.getState().auth.accessToken).toBe('access-1')
    expect(reloaded.getState().auth.refreshToken).toBe('refresh-1')

    reloaded.getState().auth.reset()
    vi.resetModules()
    const cleared = await importAuthStore()
    expect(cleared.getState().auth.accessToken).toBe('')
    expect(cleared.getState().auth.refreshToken).toBe('')
  })

  it('syncFromCookies picks up tokens stored by another tab', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.getState().auth.setSession(session)

    // Another tab refreshes and writes new cookies
    const cookie = (value: string) => encodeURIComponent(JSON.stringify(value))
    setCookie('cm_admin_token', cookie('access-2'))
    setCookie('cm_admin_refresh', cookie('refresh-2'))

    expect(useAuthStore.getState().auth.refreshToken).toBe('refresh-1')
    useAuthStore.getState().auth.syncFromCookies()
    expect(useAuthStore.getState().auth.accessToken).toBe('access-2')
    expect(useAuthStore.getState().auth.refreshToken).toBe('refresh-2')
  })
})
