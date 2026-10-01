import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/permissions'
import { ClientMap } from '@/features/client-map'
import { clientMapSearchSchema } from '@/features/client-map/data/schema'

export const Route = createFileRoute('/_authenticated/client-map/')({
  beforeLoad: requirePermission('map.view'),
  validateSearch: clientMapSearchSchema,
  component: ClientMap,
})
