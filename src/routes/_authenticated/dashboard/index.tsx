import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/permissions'
import { Dashboard } from '@/features/dashboard'

export const Route = createFileRoute('/_authenticated/dashboard/')({
  beforeLoad: requirePermission('outlets.view'),
  component: Dashboard,
})
