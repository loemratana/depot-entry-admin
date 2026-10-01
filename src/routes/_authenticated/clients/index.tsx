import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/permissions'
import { Clients } from '@/features/clients'
import { clientsSearchSchema } from '@/features/clients/data/schema'

export const Route = createFileRoute('/_authenticated/clients/')({
  beforeLoad: requirePermission('outlets.view'),
  validateSearch: clientsSearchSchema,
  component: Clients,
})
