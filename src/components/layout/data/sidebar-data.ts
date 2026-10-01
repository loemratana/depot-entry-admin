import {
  KeyRound,
  MapIcon,
  MapPin,
  Package,
  Tags,
  UserCog,
  Users,
} from 'lucide-react'
import { type AuthUser } from '@/stores/auth-store'
import { hasPermission } from '@/lib/permissions'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Outlet System',
      items: [
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
      items: group.items.filter(
        (item) => !item.permissions || hasPermission(user, ...item.permissions)
      ),
    }))
    .filter((group) => group.items.length > 0)
}
