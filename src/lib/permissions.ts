import { redirect } from '@tanstack/react-router'
import { type AuthUser, useAuthStore } from '@/stores/auth-store'

/**
 * Permission keys the backend checks (backend-api/src/modules/rbac/permissions.js).
 * The backend always enforces them; the UI only hides what the user cannot use.
 */
export type Permission =
  | 'outlets.view'
  | 'outlets.create'
  | 'outlets.update'
  | 'outlets.delete'
  | 'outlets.files'
  | 'outlets.export'
  | 'map.view'
  | 'stock.view'
  | 'stock.delete'
  | 'stock.export'
  | 'catalog.view'
  | 'catalog.manage'
  | 'locations.view'
  | 'locations.manage'
  | 'locations.import'
  | 'sales.manage'
  | 'users.view'
  | 'users.manage'
  | 'roles.manage'

/** True when the user has at least one of the permissions */
export function hasPermission(
  user: Pick<AuthUser, 'permissions'> | null | undefined,
  ...permissions: Permission[]
) {
  const granted = user?.permissions ?? []
  return permissions.some((permission) => granted.includes(permission))
}

/** `can('outlets.delete')` for the signed-in user; re-renders when permissions change */
export function useCan() {
  const user = useAuthStore((state) => state.auth.user)
  return (...permissions: Permission[]) => hasPermission(user, ...permissions)
}

/**
 * For a route's `beforeLoad`: sends users without any of the permissions to
 * the 403 page. Runs after the authenticated layout has loaded the user.
 */
export function requirePermission(...permissions: Permission[]) {
  return () => {
    const { user } = useAuthStore.getState().auth
    if (user && !hasPermission(user, ...permissions)) {
      throw redirect({ to: '/403', replace: true })
    }
  }
}

/** Pages in sidebar order, each with the permission that opens it */
export const PAGE_PERMISSIONS: { to: string; permissions: Permission[] }[] = [
  { to: '/dashboard', permissions: ['outlets.view'] },
  { to: '/clients', permissions: ['outlets.view'] },
  { to: '/client-map', permissions: ['map.view'] },
  { to: '/stock-reports', permissions: ['stock.view'] },
  { to: '/products', permissions: ['catalog.view', 'catalog.manage'] },
  { to: '/locations', permissions: ['locations.view'] },
  { to: '/users', permissions: ['users.view', 'users.manage'] },
  { to: '/roles', permissions: ['roles.manage'] },
]

/** The first page this user may open, or the 403 page when none */
export function homePageFor(user: AuthUser | null | undefined) {
  return (
    PAGE_PERMISSIONS.find((page) => hasPermission(user, ...page.permissions))
      ?.to ?? '/403'
  )
}
