import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/permissions'
import { ProvinceStock } from '@/features/dashboard/province-stock'

export const Route = createFileRoute('/_authenticated/dashboard/provinces/')({
  beforeLoad: requirePermission('stock.view'),
  component: ProvinceStock,
})
