import { createFileRoute } from '@tanstack/react-router'
import { Locations } from '@/features/locations'

export const Route = createFileRoute('/_authenticated/locations/')({
  component: Locations,
})
