import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/permissions'
import { Locations } from '@/features/locations'

export const Route = createFileRoute('/_authenticated/locations/')({
  beforeLoad: requirePermission('locations.view'),
  component: Locations,
})
