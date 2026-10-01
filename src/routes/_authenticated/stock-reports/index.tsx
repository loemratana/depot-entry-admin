import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/permissions'
import { StockReports } from '@/features/stock'

export const Route = createFileRoute('/_authenticated/stock-reports/')({
  beforeLoad: requirePermission('stock.view'),
  component: StockReports,
})
