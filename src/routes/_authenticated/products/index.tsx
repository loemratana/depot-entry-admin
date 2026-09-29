import { createFileRoute } from '@tanstack/react-router'
import { BrandsProducts } from '@/features/products'

export const Route = createFileRoute('/_authenticated/products/')({
  component: BrandsProducts,
})
