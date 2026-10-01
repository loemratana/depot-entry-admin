import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/permissions'
import { Roles } from '@/features/access/roles'

export const Route = createFileRoute('/_authenticated/roles/')({
  beforeLoad: requirePermission('roles.manage'),
  component: Roles,
})
