import { MapIcon, MapPin, Package, Users } from 'lucide-react'
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
        },
        {
          title: 'Outlet Map',
          url: '/client-map',
          icon: MapIcon,
        },
        {
          title: 'Stock',
          url: '/stock-reports',
          icon: Package,
        },
        {
          title: 'Locations',
          url: '/locations',
          icon: MapPin,
        },
      ],
    },
  ],
}
