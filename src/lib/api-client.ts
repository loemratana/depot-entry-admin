import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore, type AuthSession } from '@/stores/auth-store'

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
).replace(/\/+$/, '')

/** Full URL for a path the API returns relative to /api (e.g. a brand logo) */
export const apiUrl = (path: string) => `${API_URL}/api${path}`

/**
 * Shared axios instance for the Client Management backend.
 * Attaches the admin Bearer token and centralizes 401 handling.
 */
export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30_000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().auth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let onUnauthorized: (() => void) | undefined

/** Registered once in main.tsx so the client can redirect without importing the router. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

let refreshing: Promise<string | null> | null = null

/**
 * Swaps the refresh token for a new access + refresh token. Concurrent callers
 * share one request (the server accepts each refresh token only once).
 * Resolves to the new access token, or null when the session is over (the
 * store is then cleared). Network errors reject and keep the session.
 */
export function refreshSession(): Promise<string | null> {
  if (refreshing) return refreshing

  refreshing = (async () => {
    const { auth } = useAuthStore.getState()
    const usedRefreshToken = auth.refreshToken
    if (!usedRefreshToken) return null
    try {
      // Plain axios: this request must not go through the 401 handling below
      const res = await axios.post<ApiResponse<AuthSession>>(
        `${API_URL}/api/admin/auth/refresh`,
        { refreshToken: usedRefreshToken },
        { timeout: 30_000 }
      )
      useAuthStore.getState().auth.setSession(res.data.data)
      return res.data.data.token
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        // Another tab may have refreshed first and stored newer tokens
        useAuthStore.getState().auth.syncFromCookies()
        const latest = useAuthStore.getState().auth
        if (latest.refreshToken && latest.refreshToken !== usedRefreshToken) {
          return latest.accessToken || null
        }
        latest.reset()
        return null
      }
      throw error
    }
  })().finally(() => {
    refreshing = null
  })

  return refreshing
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (
    !(error instanceof AxiosError) ||
    error.response?.status !== 401 ||
    !error.config
  ) {
    return Promise.reject(error)
  }

  const config = error.config as RetriableConfig
  // A failed login is just a wrong password, not an expired session
  if (config.url?.includes('/admin/auth/login')) return Promise.reject(error)

  if (!config._retried && useAuthStore.getState().auth.refreshToken) {
    config._retried = true
    let token: string | null
    try {
      token = await refreshSession()
    } catch {
      // Server unreachable: keep the session and report the original error
      return Promise.reject(error)
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      return apiClient(config)
    }
  }

  // Only an authenticated request can expire
  if (config.headers?.Authorization || config._retried) {
    useAuthStore.getState().auth.reset()
    onUnauthorized?.()
  }
  return Promise.reject(error)
})

/** Standard `{ success, data, pagination }` envelope returned by the backend */
export type ApiResponse<T> = {
  success: boolean
  message?: string
  data: T
}

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  pagination: Pagination
}
