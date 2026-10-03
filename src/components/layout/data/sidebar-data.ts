import {
  KeyRound,
  LayoutDashboard,
  MapIcon,
  MapPin,
  Package,
  Tags,
  UserCog,
  Users,
} from 'lucide-react'
import { type AuthUser } from '@/stores/auth-store'
import { hasPermission } from '@/lib/permissions'
import { type NavItem, type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Outlet System',
      items: [
        {
          title: 'Dashboard',
          icon: LayoutDashboard,
          items: [
            {
              title: 'Overview',
              url: '/dashboard',
              permissions: ['outlets.view'],
            },
            {
              title: 'Stock by Province',
              url: '/dashboard/provinces',
              permissions: ['stock.view'],
            },
          ],
        },
        {
          title: 'Outlet',
          url: '/clients',
          icon: Users,
          permissions: ['outlets.view'],
        },
        {
          title: 'Outlet Map',
          url: '/client-map',
          icon: MapIcon,
          permissions: ['map.view'],
        },
        {
          title: 'Stock',
          url: '/stock-reports',
          icon: Package,
          permissions: ['stock.view'],
        },
        {
          title: 'Brands & Products',
          url: '/products',
          icon: Tags,
          permissions: ['catalog.view', 'catalog.manage'],
        },
        {
          title: 'Locations',
          url: '/locations',
          icon: MapPin,
          permissions: ['locations.view'],
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          title: 'Users',
          url: '/users',
          icon: UserCog,
          permissions: ['users.view', 'users.manage'],
        },
        {
          title: 'Roles & Permissions',
          url: '/roles',
          icon: KeyRound,
          permissions: ['roles.manage'],
        },
      ],
    },
  ],
}

/** The sidebar without the links this user cannot open (empty groups dropped) */
export function visibleNavGroups(user: AuthUser | null) {
  return sidebarData.navGroups
    .map((group) => ({
      ...group,
      items: group.items.flatMap((item): NavItem[] => {
        if (item.permissions && !hasPermission(user, ...item.permissions))
          return []
        if (!item.items) return [item]
        // A submenu keeps only the links this user can open, and disappears when empty
        const items = item.items.filter(
          (sub) => !sub.permissions || hasPermission(user, ...sub.permissions)
        )
        return items.length ? [{ ...item, items }] : []
      }),
    }))
    .filter((group) => group.items.length > 0)
}
