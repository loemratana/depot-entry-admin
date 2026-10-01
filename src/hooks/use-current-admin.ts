import { useAuthStore } from '@/stores/auth-store'
import { getDisplayNameInitials } from '@/lib/utils'

/** Signed-in admin, with neutral fallbacks until `/me` has loaded */
export function useCurrentAdmin() {
  const user = useAuthStore((state) => state.auth.user)
  const name = user?.name || 'Administrator'
  return {
    name,
    email: user?.email ?? '',
    role: user ? (user.role?.name ?? 'No role') : '',
    initials: getDisplayNameInitials(name),
  }
}
