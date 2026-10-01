import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/permissions'
import { BrandsProducts } from '@/features/products'

export const Route = createFileRoute('/_authenticated/products/')({
  beforeLoad: requirePermission('catalog.view', 'catalog.manage'),
  component: BrandsProducts,
})
