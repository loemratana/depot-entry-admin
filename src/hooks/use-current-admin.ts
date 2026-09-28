import { useAuthStore } from '@/stores/auth-store'
import { getDisplayNameInitials } from '@/lib/utils'

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
}

/** Signed-in admin, with neutral fallbacks until `/me` has loaded */
export function useCurrentAdmin() {
  const user = useAuthStore((state) => state.auth.user)
  const name = user?.name || 'Administrator'
  return {
    name,
    email: user?.email ?? '',
    role: user?.role ? formatRole(user.role) : 'Admin',
    initials: getDisplayNameInitials(name),
  }
}
