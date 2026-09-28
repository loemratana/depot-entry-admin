import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const ACCESS_TOKEN = 'cm_admin_token'

/** Admin profile as returned by `/api/admin/auth/login` and `/me` */
export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    /** `maxAge` in seconds; keep the cookie no longer than the JWT is valid */
    setAccessToken: (accessToken: string, maxAge?: number) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

function readPersistedToken(): string {
  const cookieState = getCookie(ACCESS_TOKEN)
  if (!cookieState) return ''
  try {
    const token = JSON.parse(decodeURIComponent(cookieState))
    return typeof token === 'string' ? token : ''
  } catch {
    return ''
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const initToken = readPersistedToken()
  return {
    auth: {
      user: null,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      accessToken: initToken,
      setAccessToken: (accessToken, maxAge) =>
        set((state) => {
          setCookie(
            ACCESS_TOKEN,
            encodeURIComponent(JSON.stringify(accessToken)),
            maxAge
          )
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
    },
  }
})
