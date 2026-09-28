import { createFileRoute } from '@tanstack/react-router'
import { Clients } from '@/features/clients'
import { clientsSearchSchema } from '@/features/clients/data/schema'

export const Route = createFileRoute('/_authenticated/clients/')({
  validateSearch: clientsSearchSchema,
  component: Clients,
})
