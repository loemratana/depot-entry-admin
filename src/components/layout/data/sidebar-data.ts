import { MapPin, Users } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Client System',
      items: [
        {
          title: 'Clients',
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
