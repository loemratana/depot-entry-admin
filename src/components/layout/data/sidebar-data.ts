import { MapPin, Users } from 'lucide-react'
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
          title: 'Locations',
          url: '/locations',
          icon: MapPin,
        },
      ],
    },
  ],
}
