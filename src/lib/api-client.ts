import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
).replace(/\/+$/, '')

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

apiClient.interceptors.response.use(undefined, (error: unknown) => {
  if (
    error instanceof AxiosError &&
    error.response?.status === 401 &&
    // Only an authenticated request can expire; a failed login is just a 401
    error.config?.headers?.Authorization
  ) {
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
