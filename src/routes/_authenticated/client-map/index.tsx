import { createFileRoute } from '@tanstack/react-router'
import { ClientMap } from '@/features/client-map'
import { clientMapSearchSchema } from '@/features/client-map/data/schema'

export const Route = createFileRoute('/_authenticated/client-map/')({
  validateSearch: clientMapSearchSchema,
  component: ClientMap,
})
