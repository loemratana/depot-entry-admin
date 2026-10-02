import { describe, expect, it } from 'vitest'
import { visibleNavGroups } from '@/components/layout/data/sidebar-data'
import { hasPermission, homePageFor } from './permissions'

const user = (permissions: string[]) => ({
  id: 'u1',
  name: 'U',
  email: 'u@example.com',
  role: { id: 'r1', name: 'Role', isSystem: false },
  permissions,
})

describe('permissions', () => {
  it('hasPermission is true when any one of the permissions is granted', () => {
    const viewer = user(['outlets.view', 'map.view'])
    expect(hasPermission(viewer, 'outlets.view')).toBe(true)
    expect(hasPermission(viewer, 'outlets.delete', 'map.view')).toBe(true)
    expect(hasPermission(viewer, 'outlets.delete')).toBe(false)
    expect(hasPermission(null, 'outlets.view')).toBe(false)
  })

  it('home is the first page the user may open, else 403', () => {
    expect(homePageFor(user(['outlets.view', 'stock.view']))).toBe('/dashboard')
    expect(homePageFor(user(['stock.view']))).toBe('/stock-reports')
    expect(homePageFor(user(['catalog.manage']))).toBe('/products')
    expect(homePageFor(user(['roles.manage']))).toBe('/roles')
    expect(homePageFor(user([]))).toBe('/403')
  })

  it('the sidebar shows only permitted links and drops empty groups', () => {
    const titles = (permissions: string[]) =>
      visibleNavGroups(user(permissions)).map((group) => ({
        group: group.title,
        items: group.items.map((item) => item.title),
      }))

    expect(titles(['outlets.view', 'stock.view'])).toEqual([
      {
        group: 'Outlet System',
        items: ['Dashboard', 'Outlet', 'Stock'],
      },
    ])
    expect(titles(['users.view'])).toEqual([
      { group: 'Administration', items: ['Users'] },
    ])
    expect(titles([])).toEqual([])
  })
})
