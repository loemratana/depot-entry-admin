import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/permissions'
import { Users } from '@/features/access/users'

export const Route = createFileRoute('/_authenticated/users/')({
  beforeLoad: requirePermission('users.view', 'users.manage'),
  component: Users,
})
