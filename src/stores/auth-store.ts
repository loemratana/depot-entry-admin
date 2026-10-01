import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const ACCESS_TOKEN = 'cm_admin_token'
const REFRESH_TOKEN = 'cm_admin_refresh'

/** Admin profile as returned by `/api/admin/auth/login` and `/me` */
export interface AuthUser {
  id: string
  name: string
  email: string
  /** null for an account without a role (it can only sign in and out) */
  role: { id: string; name: string; isSystem: boolean } | null
  /** What this user may do, e.g. "outlets.view" (see lib/permissions) */
  permissions: string[]
}

/** Tokens returned by `/api/admin/auth/login` and `/refresh` */
export interface AuthSession {
  token: string
  expiresAt: string
  refreshToken: string
  refreshExpiresAt: string
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    refreshToken: string
    /** `maxAge` in seconds; keep the cookie no longer than the JWT is valid */
    setAccessToken: (accessToken: string, maxAge?: number) => void
    /** Stores both tokens, each cookie kept only as long as its token is valid */
    setSession: (session: AuthSession) => void
    /** Picks up tokens another tab stored (it may have refreshed first) */
    syncFromCookies: () => void
    resetAccessToken: () => void
    reset: () => void
  }
}

function readPersistedToken(name: string): string {
  const cookieState = getCookie(name)
  if (!cookieState) return ''
  try {
    const token = JSON.parse(decodeURIComponent(cookieState))
    return typeof token === 'string' ? token : ''
  } catch {
    return ''
  }
}

const secondsUntil = (iso: string) => {
  const seconds = Math.floor((new Date(iso).getTime() - Date.now()) / 1000)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined
}

const persist = (name: string, token: string, maxAge?: number) =>
  setCookie(name, encodeURIComponent(JSON.stringify(token)), maxAge)

export const useAuthStore = create<AuthState>()((set) => ({
  auth: {
    user: null,
    setUser: (user) =>
      set((state) => ({ ...state, auth: { ...state.auth, user } })),
    accessToken: readPersistedToken(ACCESS_TOKEN),
    refreshToken: readPersistedToken(REFRESH_TOKEN),
    setAccessToken: (accessToken, maxAge) =>
      set((state) => {
        persist(ACCESS_TOKEN, accessToken, maxAge)
        return { ...state, auth: { ...state.auth, accessToken } }
      }),
    setSession: ({ token, expiresAt, refreshToken, refreshExpiresAt }) =>
      set((state) => {
        persist(ACCESS_TOKEN, token, secondsUntil(expiresAt))
        persist(REFRESH_TOKEN, refreshToken, secondsUntil(refreshExpiresAt))
        return {
          ...state,
          auth: { ...state.auth, accessToken: token, refreshToken },
        }
      }),
    syncFromCookies: () =>
      set((state) => ({
        ...state,
        auth: {
          ...state.auth,
          accessToken: readPersistedToken(ACCESS_TOKEN),
          refreshToken: readPersistedToken(REFRESH_TOKEN),
        },
      })),
    resetAccessToken: () =>
      set((state) => {
        removeCookie(ACCESS_TOKEN)
        return { ...state, auth: { ...state.auth, accessToken: '' } }
      }),
    reset: () =>
      set((state) => {
        removeCookie(ACCESS_TOKEN)
        removeCookie(REFRESH_TOKEN)
        return {
          ...state,
          auth: {
            ...state.auth,
            user: null,
            accessToken: '',
            refreshToken: '',
          },
        }
      }),
  },
}))
