import { AxiosError } from 'axios'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { refreshSession } from '@/lib/api-client'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { currentAdminQueryOptions } from '@/features/auth/api'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const { auth } = useAuthStore.getState()

    // Access token gone (after 14 days) but the refresh token still valid: renew quietly
    if (!auth.accessToken && auth.refreshToken) {
      try {
        await refreshSession()
      } catch {
        // Backend unreachable: handled below like a missing session
      }
    }

    if (!useAuthStore.getState().auth.accessToken) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
        replace: true,
      })
    }

    if (!auth.user) {
      try {
        const admin = await context.queryClient.ensureQueryData(
          currentAdminQueryOptions
        )
        auth.setUser(admin)
      } catch (error) {
        // Invalid/expired token: the API client already cleared the session
        if (error instanceof AxiosError && error.response?.status === 401) {
          throw redirect({
            to: '/login',
            search: { redirect: location.href },
            replace: true,
          })
        }
        // Backend unreachable etc.: keep the session, pages show their own errors
      }
    }
  },
  component: AuthenticatedLayout,
})
