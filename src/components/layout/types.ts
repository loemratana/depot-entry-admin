import { type LinkProps } from '@tanstack/react-router'
import { type Permission } from '@/lib/permissions'

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
  /** Shown only to users with at least one of these */
  permissions?: Permission[]
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
}

type SidebarData = {
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
