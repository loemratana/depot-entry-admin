import { queryOptions } from '@tanstack/react-query'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { apiClient, type ApiResponse } from '@/lib/api-client'

export type LoginInput = {
  email: string
  password: string
}

export type LoginResult = {
  token: string
  tokenType: 'Bearer'
  /** Access token expiry (14 days) */
  expiresAt: string
  refreshToken: string
  /** Refresh token expiry (30 days) */
  refreshExpiresAt: string
  admin: AuthUser
}

export async function login(input: LoginInput) {
  const res = await apiClient.post<ApiResponse<LoginResult>>(
    '/admin/auth/login',
    input
  )
  return res.data.data
}

export async function getCurrentAdmin() {
  const res = await apiClient.get<ApiResponse<AuthUser>>('/admin/auth/me')
  return res.data.data
}

/** Revokes the access token and, when present, the refresh session */
export async function logout() {
  const { refreshToken } = useAuthStore.getState().auth
  await apiClient.post(
    '/admin/auth/logout',
    refreshToken ? { refreshToken } : undefined
  )
}

export const currentAdminQueryOptions = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: getCurrentAdmin,
  staleTime: 5 * 60 * 1000,
  retry: false,
})

/** Only allow in-app paths as post-login redirects (prevents open redirects). */
export function getSafeRedirect(redirect: string | undefined) {
  if (!redirect) return '/clients'
  try {
    const url = new URL(redirect, window.location.origin)
    if (url.origin !== window.location.origin) return '/clients'
    const path = `${url.pathname}${url.search}${url.hash}`
    return path.startsWith('/login') ? '/clients' : path
  } catch {
    return '/clients'
  }
}
