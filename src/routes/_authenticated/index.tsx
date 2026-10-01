import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { homePageFor } from '@/lib/permissions'

// Opens the first page the signed-in user is allowed to see
export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    throw redirect({
      to: homePageFor(useAuthStore.getState().auth.user),
      replace: true,
    })
  },
})
